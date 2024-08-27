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

async function runMockup(pyodide) {
  let pythonNamespace = pyodide.globals.get("dict")();
  await pyodide.runPythonAsync(
    `
      import mockup
      import image_process
      from js import locationKey, imageUploadList, deviceInfo, deviceId
      origin_image_List = await image_process.upload_files()
      print("start mockup")
      output_img_path_list = await mockup.startMockup(locationKey, deviceId, origin_image_List, deviceInfo)
    `,
    { globals: pythonNamespace },
  );
  pyodide.runPython(
    `
        temp = image_process.save_images(output_img_path_list)
    `,
    { globals: pythonNamespace },
  );
  return pythonNamespace.get("temp").toJs();
}

async function main() {
  let pyodideObject = initianPyodide();
  self["previewJobQueue"] = [];
  self.onmessage = async (event) => {
    pyodideObject = await pyodideObject;

    self["imageUploadList"] = event.data.imageUploadList;
    self["imageUpload"] = undefined;
    self["locationKey"] = event.data.location;
    self["deviceId"] = event.data.deviceId;
    self["deviceInfo"] = event.data.deviceInfo;

    try {
      let results = await runMockup(pyodideObject);
      console.log("results", results);
      self.postMessage(results);
    } catch (error) {
      self.postMessage({ error: error.message });
    }
  };
}

main();
