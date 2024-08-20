importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js");

async function initianPyodide() {
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

// Now only the first orientation model is generated for preview
async function runPreviewMockup(pyodide) {
  let pythonNamespace = pyodide.globals.get("dict")();
  await pyodide.runPythonAsync(
    `
      import mockup
      import image_process
      from js import locationKey, imageUpload, deviceInfo, deviceId
      origin_image_path = await image_process.upload_file()
      print("start preview", origin_image_path)
      output_img = await mockup.previewMockup(locationKey, deviceId, origin_image_path, deviceInfo)
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
  let pyodideObject = initianPyodide();
  self.onmessage = async (event) => {
    pyodideObject = await pyodideObject;

    self["imageUploadList"] = undefined;
    self["imageUpload"] = event.data.imageUpload;
    self["locationKey"] = event.data.location;
    self["deviceId"] = event.data.deviceId;
    self["deviceInfo"] = event.data.deviceInfo;

    try {
      // TODO: Handle preview loading state in widget
      let results = await runPreviewMockup(pyodideObject);
      console.log("preview results", results);
      self.postMessage({ ulid: event.data.ulid, results: results });
    } catch (error) {
      self.postMessage({ error: error.message });
    }
  };
}

main();
