import JSZip from "jszip";
import localforage from "localforage";
import { saveAs } from "file-saver";

async function allStorage() {
  var values = new Map(),
    keys = Object.keys(localStorage),
    i = keys.length;
  return localforage
    .getItem("generatedMockups")
    .then(function (generatedMockups) {
      generatedMockups.forEach(function (mockup) {
        if (mockup.status === "success") {
          values.set(mockup.results[0], mockup.results[1]);
        } else {
          values.set(mockup.image, null);
        }
      });
      return values;
    });
}

function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[arr.length - 1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function getJSZipDateWithOffset() {
  // copied workaround to fix JSZip bug https://github.com/Stuk/jszip/issues/369#issuecomment-388324954
  const currDate = new Date();
  const dateWithOffset = new Date(
    currDate.getTime() - currDate.getTimezoneOffset() * 60000,
  );

  return dateWithOffset;
}

export async function generateZIP(deviceId) {
  var zip = new JSZip();
  var count = 0;
  const zipFilename = !!deviceId ? `${deviceId}-mockup.zip` : "mockup.zip";
  var images = new Map();
  var dataurlkey = await allStorage();
  var failedImages = [];
  dataurlkey.forEach(function (value, key) {
    // Only zip successfully generated mockups
    if (value !== null) {
      var file = dataURLtoFile(value, key.substring(3, key.length) + ".png");
      images.set(key, URL.createObjectURL(file));
    } else {
      failedImages.push(key);
    }
  });
  images.forEach(async function (imgURL, k) {
    var filename = unescape(k.substring(3, k.length)) + ".png";
    var image = await fetch(imgURL);
    var imageBlob = await image.blob();
    zip.file(filename, imageBlob, {
      binary: true,
      date: getJSZipDateWithOffset(),
    });
    count++;
    if (count == images.size) {
      zip.generateAsync({ type: "blob" }).then(function (content) {
        saveAs(content, zipFilename);
      });
    }
  });
}
