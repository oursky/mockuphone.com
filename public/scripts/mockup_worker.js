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
      from mockup import MockupGenerator
      import image_process
      from js import locationKey, deviceInfo, deviceId, orientationsQueue

      async def runMockup():
        origin_image_path = await image_process.upload_file()
        orientation = orientationsQueue.shift()
        print("start mockup", origin_image_path)
        print("orientation", orientation)
        
        mockup_generator = MockupGenerator(locationKey, deviceId, origin_image_path, deviceInfo, orientation)
        return await mockup_generator.mockup()

      output_img = await runMockup()
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
  self["orientationsQueue"] = [];
  self.onmessage = async (event) => {
    pyodideObject = await pyodideObject;

    self["previewJobQueue"].push(event.data.imageUpload);
    self["locationKey"] = event.data.location;
    self["deviceId"] = event.data.deviceId;
    self["deviceInfo"] = event.data.deviceInfo;
    self["orientationsQueue"].push(event.data.orientation);

    try {
      let results = await runMockup(pyodideObject);
      console.log("mockup results", results);
      self.postMessage({
        ulid: event.data.ulid,
        results: results,
      });
    } catch (error) {
      self.postMessage({ ulid: event.data.ulid, error: error.message });
    }
  };
}

main();
