import JSZip from "jszip";
import localforage from "localforage";
import { saveAs } from "file-saver";
import { showToast } from "../../scripts/utils/toast/toast";

async function allStorage() {
  var values = new Map(),
    keys = Object.keys(localStorage),
    i = keys.length;
  return localforage
    .getItem("generatedMockups")
    .then(function (generatedMockups) {
      generatedMockups.forEach(function (mockup) {
        if (mockup.status === "success") {
          const [filename, fileBytes] = mockup.results;
          values.set(filename, fileBytes);
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

function handlePartialSuccess(failedImages) {
  const description = `
    <div>Image(s) failed to generate. Try a different image/device:</div>
    <ul>
      ${failedImages.map((failedImage) => `<li>${failedImage}</li>`).join("")}
    </ul>
    <div>If the issue persists, please report it on <a href='https://github.com/oursky/mockuphone.com/issues'>Github</a></div>
  `;

  showToast({
    title: "Partial Success",
    description: description,
    avatar: "/images/upload-warning.svg",
  });
}

function handleNoGeneratedMockup() {
  const description = `
    <div>Try a different image/device. <br> If the issue persists, please report it on <a href='https://github.com/oursky/mockuphone.com/issues'>Github</a></div>
  `;
  showToast({
    title: "No generated mockup",
    description: description,
    avatar: "/images/upload-error.svg",
  });
}

function downloadGeneratedMockup(deviceId, images) {
  var zip = new JSZip();
  var count = 0;
  const zipFilename = !!deviceId ? `${deviceId}-mockup.zip` : "mockup.zip";

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

export async function generateZIP(deviceId) {
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

  downloadGeneratedMockup(deviceId, images);

  if (failedImages.length > 0 && images.size > 0) {
    handlePartialSuccess(failedImages);
  }

  if (images.size === 0) {
    handleNoGeneratedMockup();
  }
}
