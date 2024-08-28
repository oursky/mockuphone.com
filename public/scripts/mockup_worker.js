importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js");

async function initiatePyodide() {
  console.log("start startup");
  const pyodide = await loadPyodide();
  await pyodide.loadPackage(["numpy", "opencv-python", "pillow", "micropip"]);
  let zipResponse = await fetch("/mockup.zip");
  let zipBinary = await zipResponse.arrayBuffer();
  pyodide.unpackArchive(zipBinary, "zip");
  await pyodide.runPythonAsync(
    `
      from pyodide.http import pyfetch
      response = await pyfetch("/image_process.py")
      with open("./image_process.py", "wb") as f:
        f.write(await response.bytes())
    `,
    (output) => console.log(output),
    (output) => console.log(output),
  );
  console.log("end up");
  return pyodide;
}

async function runMockup(pyodide) {
  let pythonNamespace = pyodide.globals.get("dict")();
  await pyodide.runPythonAsync(
    `
      import mockup
      import image_process
      from js import locationKey, deviceInfo, deviceId, orientationIndexQueue
      origin_image_path = await image_process.upload_file()
      orientationIndex = orientationIndexQueue.shift()
      print("start mockup", origin_image_path)
      print("orientation index", orientationIndex)
      output_img = await mockup.previewMockup(locationKey, deviceId, origin_image_path, deviceInfo, orientationIndex)
    `,
    { globals: pythonNamespace },
  );
  pyodide.runPython(
    `
        temp = image_process.save_image(output_img)
    `,
    { globals: pythonNamespace },
  );
  return pythonNamespace.get("temp").toJs();
}

async function main() {
  let pyodideObject = initiatePyodide();
  self["previewJobQueue"] = [];
  self["orientationIndexQueue"] = [];
  self.onmessage = async (event) => {
    pyodideObject = await pyodideObject;

    self["imageUploadList"] = undefined;
    self["previewJobQueue"].push(event.data.imageUpload);
    self["locationKey"] = event.data.location;
    self["deviceId"] = event.data.deviceId;
    self["deviceInfo"] = event.data.deviceInfo;
    self["orientationIndexQueue"].push(event.data.orientationIndex ?? 0);

    try {
      let results = await runMockup(pyodideObject);
      console.log("mockup results", results);
      self.postMessage({
        ulid: event.data.ulid,
        results: results,
        mode: event.data.mode,
      });
    } catch (error) {
      self.postMessage({ ulid: event.data.ulid, error: error.message });
    }
  };
}

main();
