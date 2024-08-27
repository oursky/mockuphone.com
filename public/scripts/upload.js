/*
Require: mobx,
         utils/images.js, utils/scroll.js, services/presign.js, models/image-upload.js
*/
let dragZoneCounter = 0; // https://stackoverflow.com/a/21002544/19287186
const MAX_FILE_SIZE_BYTE = 104857600;
const MAX_FILE_SIZE_READABLE = "100 MB";
const MAX_MOCKUP_WAIT_SEC = 1000000000;

function ready(fn) {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
ready(main);

async function runWorker(worker) {
  imageUploadList = viewModel.fileList._imageUploads
    .filter((i) => i.isSuccessState)
    .map((item) => item.imageFile);
  worker.postMessage({
    imageUploadList: imageUploadList,
    location: window.location.toString(),
    deviceId: window.workerDeviceId,
    deviceInfo: window.deviceInfo,
  });
  worker.addEventListener(
    "message",
    function (e) {
      window.pictureArray = e.data;
      window.localforage
        .setItem("pictureArray", e.data)
        .then(function (pictureArray) {
          if (e.data["error"] !== undefined) {
            console.log("Get error while generating mockup", e.data["error"]);
            window.viewModel.cancelMockup();

            // Alert after `cancelMockup` finish
            setTimeout(() => {
              alert(
                "Oops, something went wrong. Please try a different image/device.\nIf it persists, we'd appreciate if you report it on our GitHub 🙏  https://github.com/oursky/mockuphone.com/issues.",
              );
            }, 100);
            return;
          }
          window.location.href = "/download/?deviceId=" + window.workerDeviceId;
        })
        .catch(function (err) {
          console.error("Get error while storing images to localforage:", err);
        });
    },
    false,
  );
}

function runPreviewWorker(worker, imageUpload) {
  const imageUploadFile = imageUpload.file;
  worker.worker.postMessage({
    imageUpload: imageUploadFile,
    location: window.location.toString(),
    deviceId: window.workerDeviceId,
    deviceInfo: window.deviceInfo,
    ulid: imageUpload.ulid,
  });
  worker.worker.addEventListener(
    "message",
    function (e) {
      if (e.data["error"] !== undefined) {
        console.log(
          "Get error while generating preview image",
          e.data["error"],
        );
        window.viewModel.fileList.updateImageUploadStateByULID(
          e.data["ulid"],
          ImageUploadState.ErrPreview,
        );
        return;
      }

      const ulid = e.data["ulid"];
      const [_, previewUrl] = e.data["results"];

      const imageContainer = document.querySelector(
        ".upload__device-image-rect",
      );

      // If no existing preview, set first success preview
      if (window.viewModel.selectedPreviewImageULID == null) {
        window.viewModel.selectedPreviewImageULID = ulid;
      }

      /* Put first generated mockup to preview area */
      if (window.viewModel.selectedPreviewImageULID === ulid) {
        imageContainer.style.backgroundImage = `url(${previewUrl})`;

        const imageUploadHints = document.querySelectorAll(
          ".upload__device-hint",
        );
        imageUploadHints.forEach((imageUploadHint) => {
          imageUploadHint.style.display = "none";
        });

        // scroll to preview section on mobile devices
        if (window.innerWidth <= 992) {
          const previewSection = document.querySelector(".device");
          const HEADER_HEIGHT = 80;
          scrollToElementTop(previewSection, HEADER_HEIGHT);
        }
      }
      window.viewModel.fileList.updateImageUploadPreviewUrlByULID(
        ulid,
        previewUrl,
      );
      window.viewModel.fileList.updateImageUploadStateByULID(
        ulid,
        ImageUploadState.ReadSuccess,
      );

      window.viewModel.idleWorker(worker);
    },
    false,
  );
}

class FileListViewModel {
  maxFileSizeByte = null;
  _imageUploads = [];

  constructor(maxFileSizeByte) {
    mobx.makeObservable(this, {
      _imageUploads: mobx.observable,
      imageUploads: mobx.computed,
      isProcessing: mobx.computed,
      isReadyForMockup: mobx.computed,
      add: mobx.action,
      remove: mobx.action,
    });
    this.maxFileSizeByte = maxFileSizeByte;
  }

  get imageUploads() {
    return this._imageUploads;
  }

  get isProcessing() {
    return this._imageUploads.some(
      (imageUpload) => imageUpload.isProcessingState,
    );
  }

  get isReadyForMockup() {
    return (
      !this.isProcessing &&
      this._imageUploads.some((imageUpload) => imageUpload.isSuccessState)
    );
  }

  async add(file) {
    let files = [];
    if (Array.isArray(file)) {
      files = file;
    } else {
      files = [file];
    }

    for (let i = 0; i < files.length; i += 1) {
      const imageUpload = new ImageUpload(files[i], MAX_FILE_SIZE_BYTE);
      await imageUpload.read();
      imageUpload.ulid = ULID.ulid();
      this._imageUploads.push(imageUpload);
    }
  }

  async remove(filename, fileUlid) {
    this._imageUploads = this._imageUploads.filter((upload) => {
      const isSameFilename = upload.file.name === filename;
      const isSameULID = fileUlid === upload.ulid;
      return !(isSameFilename && isSameULID);
    });

    if (viewModel.selectedPreviewImageULID === fileUlid) {
      viewModel.selectedPreviewImageULID = viewModel.defaultImageUploadULID;
    }
  }

  updateImageUploadStateByULID(ulid, state) {
    this._imageUploads = this._imageUploads.map((imageUpload) => {
      if (imageUpload.ulid == ulid) {
        imageUpload.state = state;
      }
      return imageUpload;
    });
  }

  updateImageUploadPreviewUrlByULID(ulid, previewUrl) {
    this._imageUploads = this._imageUploads.map((imageUpload) => {
      if (imageUpload.ulid == ulid) {
        imageUpload.previewUrl = previewUrl;
      }
      return imageUpload;
    });
  }
}

class RootViewModel {
  maxMockupWaitSec;
  fileList;
  isFileDragEnter = false;
  _isGeneratingMockup = false;
  worker = new Worker("/scripts/web_worker.js");
  workerPool = [];
  maxWorkers = 4;
  selectedColorId = null;
  selectedPreviewImageULID = null;

  constructor(maxMockupWaitSec, fileListViewModel, selectedColorId) {
    mobx.makeObservable(this, {
      selectedColorId: mobx.observable,
      isFileDragEnter: mobx.observable,
      _isGeneratingMockup: mobx.observable,
      isGeneratingMockup: mobx.computed,
      generateMockup: mobx.action,
      cancelMockup: mobx.action,
      selectedPreviewImageULID: mobx.observable,
    });
    this.selectedColorId = selectedColorId;
    this.maxMockupWaitSec = maxMockupWaitSec;
    this.fileList = fileListViewModel;
    this.maxWorkers = navigator.hardwareConcurrency || 4;

    // Reserve one worker to generate the final mockup, will update later
    for (let i = 0; i < this.maxWorkers - 1; i += 1) {
      const newWorker = new Worker("/scripts/preview_worker.js");
      this.workerPool.push({
        worker: newWorker,
        ulid: ULID.ulid(),
        isIdle: true,
      });
    }
  }

  get isGeneratingMockup() {
    return this._isGeneratingMockup;
  }

  async generatePreviewMockup(imageUpload) {
    if (imageUpload.isErrorState) {
      return;
    }
    window.viewModel.fileList.updateImageUploadStateByULID(
      imageUpload.ulid,
      ImageUploadState.GeneratingPreview,
    );
    runPreviewWorker(await this.getPreviewWorker(), imageUpload);
  }

  async generateMockup() {
    if (!this.fileList.isReadyForMockup) {
      console.warn("Cannot generate mockup at this moment");
      return;
    }
    this._isGeneratingMockup = true;
    runWorker(this.worker);
  }

  cancelMockup() {
    if (!this.isGeneratingMockup) {
      return;
    }
    this._isGeneratingMockup = false;
    this.worker.terminate();
    this.worker = new Worker("/scripts/web_worker.js");
  }

  get previewUrl() {
    return "/download/?deviceId=" + window.workerDeviceId;
  }

  get defaultImageUploadULID() {
    return this.fileList.imageUploads.length > 0
      ? this.fileList.imageUploads[0].ulid
      : null;
  }

  async getPreviewWorker() {
    let availableWorker = this.workerPool.find((worker) => worker.isIdle);
    if (availableWorker) {
      this.startWorker(availableWorker);
      return availableWorker;
    } else {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          const idleWorker = this.workerPool.find((worker) => worker.isIdle);
          if (idleWorker) {
            idleWorker.isIdle = false;
            clearInterval(interval);
            resolve(idleWorker);
          }
        }, 100);
      });
    }
  }

  startWorker(worker) {
    const index = this.workerPool.findIndex((w) => w.ulid === worker.ulid);
    if (index !== -1) {
      this.workerPool[index].isIdle = false;
    }
  }

  idleWorker(worker) {
    const index = this.workerPool.findIndex((w) => w.ulid === worker.ulid);
    if (index !== -1) {
      this.workerPool[index].isIdle = true;
    }
  }

  terminateWorker(worker) {
    const index = this.workerPool.findIndex((w) => w.ulid === worker.ulid);
    if (index !== -1) {
      this.workerPool.splice(index, 1);
    }
    worker.worker.terminate();
  }
}

function preventDefault(node, events) {
  if (typeof events === "string") {
    events = [events];
  }
  events.forEach((event) => {
    node.addEventListener(event, (e) => {
      e.preventDefault();
    });
  });
}

function showUploading() {
  const uploadGuide = document.querySelector(".upload-guide");
  const uploading = document.querySelector(".uploading");
  Array.from(uploadGuide.children).forEach((node) => {
    node.classList.add("d-none");
  });
  uploading.classList.remove("d-none");
}

function dismissUploading() {
  const uploadGuide = document.querySelector(".upload-guide");
  const uploading = document.querySelector(".uploading");
  Array.from(uploadGuide.children).forEach((node) => {
    node.classList.remove("d-none");
  });
  uploading?.classList.add("d-none");
}

function findFileListItem(fileUlid) {
  const fileListNode = document.querySelector(".file-list");
  const itemNodes = fileListNode.querySelectorAll(".file-list-item");
  for (const itemNode of itemNodes) {
    if (itemNode.dataset.fileUlid === String(fileUlid)) {
      return itemNode;
    }
  }
  return null;
}

function appendInitialFileListItem(fileUlid, filename) {
  const fileListNode = document.querySelector(".file-list");

  const itemNode = document.createElement("li");

  const fileInfoNode = document.createElement("div");
  const previewStateNode = document.createElement("div");

  previewStateNode.classList.add("file-list-item__preview-state");
  itemNode.appendChild(previewStateNode);

  fileInfoNode.classList.add("file-list-item__file-info");
  itemNode.appendChild(fileInfoNode);

  itemNode.classList.add("file-list-item");
  itemNode.dataset.fileUlid = fileUlid;

  const headerNode = document.createElement("div");
  headerNode.classList.add("file-list-item__filename");
  const filenameNode = document.createElement("span");
  filenameNode.innerText = filename;
  filenameNode.classList.add("file-list-item__filename-content");
  headerNode.appendChild(filenameNode);

  const crossNode = document.createElement("button");
  crossNode.classList.add("file-list-item__cross");
  crossNode.onclick = async (event) => {
    // Prevent triggering of click event on parent node
    event.stopPropagation();
    await window.viewModel.fileList.remove(filename, fileUlid);
  };
  headerNode.appendChild(crossNode);

  fileInfoNode.appendChild(headerNode);
  fileInfoNode.insertAdjacentHTML(
    "beforeend",
    `<p class="file-list-item__hint d-none"></p>`,
  );

  return fileListNode.appendChild(itemNode);
}

function removeAllFileListItems() {
  const fileListNode = document.querySelector(".file-list");
  fileListNode.replaceChildren();
}

function updateFileListItem(itemNode, imageUpload) {
  const hintNode = itemNode.querySelector(".file-list-item__hint");
  const previewNode = itemNode.querySelector(".file-list-item__preview-state");
  const fileInfoNode = itemNode.querySelector(".file-list-item__file-info");

  function onSelectPreviewImage() {
    const deviceSection = document.querySelector(".device");

    // scroll to device section on mobile devices
    if (window.innerWidth <= 992) {
      const HEADER_HEIGHT = 80;
      scrollToElementTop(deviceSection, HEADER_HEIGHT);
    }
    window.viewModel.selectedPreviewImageULID = imageUpload.ulid;
  }

  // clear previous state
  itemNode.classList.remove(
    "file-list-item--done",
    "file-list-item--error",
    "file-list-item--warning",
    "file-list-item__previewable",
  );
  previewNode.classList.remove(
    "file-list-item__preview_selected",
    "file-list-item__preview_non_selected",
  );

  /* Expected UI for each state
|              | error (correct ratio) | error (wrong ratio) | processing (correct ratio) | processing (wrong ratio) | done (correct ratio) | done (wrong ratio) |
|--------------|:---------------------:|:-------------------:|:--------------------------:|:------------------------:|:--------------------:|:------------------:|
| error icon   |           y           |          y          |                            |                          |                      |                    |
| warning icon |                       |                     |                            |            y             |                      |         y          |
| done icon    |                       |                     |                            |                          |          y           |                    |
| hint text    |      error hint       |     error hint      |                            |        ratio hint        |                      |     ratio hint     |
  */

  // const  deviceData  = passResolution();
  const imageDim = {
    width: imageUpload.width,
    height: imageUpload.height,
  };
  const imageDimRotate = {
    width: imageUpload.height,
    height: imageUpload.width,
  };
  const recommendDim = {
    width: window.location.recommendsize[0],
    height: window.location.recommendsize[1],
  };
  const recommendAspectRatio = recommendDim.width / recommendDim.height;
  const isCorrectDim =
    isSameAspectRatio(imageDim, recommendDim) ||
    isSameAspectRatio(imageDimRotate, recommendDim);
  const shouldShowAspectRatioWarning =
    imageUpload.state !== ImageUploadState.Reading && !isCorrectDim;
  // Update status icon
  // error status has higher precedence over warning
  if (imageUpload.isErrorState) {
    itemNode.classList.remove("file-list-item--loading");
    itemNode.classList.add("file-list-item--error");
  } else if (shouldShowAspectRatioWarning) {
    itemNode.classList.add("file-list-item--warning");
  }

  if (imageUpload.isGeneratingPreviewState) {
    itemNode.classList.remove("file-list-item--done");
    itemNode.classList.add("file-list-item--loading");
  }

  if (imageUpload.isSuccessState) {
    itemNode.classList.remove("file-list-item--loading");
    itemNode.classList.add(
      "file-list-item--done",
      "file-list-item__previewable",
    );
  }
  // update hint text
  if (imageUpload.isErrorState) {
    switch (imageUpload.state) {
      case ImageUploadState.ErrUnsupportedFileType:
        hintNode.innerText = "Supported file extensions: JPG, PNG or PSD.";
        break;
      case ImageUploadState.ErrExceedMaxFileSize:
        hintNode.innerText = `File size should be less than ${MAX_FILE_SIZE_READABLE}.`;
        break;
      case ImageUploadState.ErrPreview:
        hintNode.innerText =
          "Preview failed. Please upload the image again to retry.";
        break;
      case ImageUploadState.ErrRead:
      default:
        hintNode.innerText =
          "Something went wrong. Please try upload again or refresh the page.";
        break;
    }
  } else if (shouldShowAspectRatioWarning) {
    hintNode.innerText = `Uploaded file dimension (${imageDim.width} × ${imageDim.height} pixels) differs from ideal (${recommendDim.width} × ${recommendDim.height} pixels).`;
  }

  // update preview button
  if (imageUpload.isSuccessState) {
    if (window.viewModel.selectedPreviewImageULID == imageUpload.ulid) {
      previewNode.classList.add("file-list-item__preview_selected");
    } else {
      previewNode.classList.add("file-list-item__preview_non_selected");
    }

    previewNode.addEventListener("click", onSelectPreviewImage);
    fileInfoNode.addEventListener("click", onSelectPreviewImage);
  }

  if (imageUpload.isSuccessState && !shouldShowAspectRatioWarning) {
    hintNode.classList.add("d-none");
  } else {
    hintNode.classList.remove("d-none");
  }
}

function handleColorPickersTooltip() {
  tippy("[data-tippy-content]", {
    placement: "bottom-end",
    theme: "light-border",
  });
}

function handleColorPickers(viewModel) {
  const colorPickerItems = document.querySelectorAll(".color-picker-item");
  colorPickerItems.forEach((node) => {
    node.addEventListener("click", (e) => {
      viewModel.selectedColorId = e.target.dataset.colorId;
    });
  });

  const deviceImage = document.querySelector(".upload__device-image");
  const orientationImages = document.querySelectorAll(
    ".device-support__orientation-image",
  );
  const creditsDesc = document.querySelector(".device-credits__desc");
  const uploadGuideHintX = document.querySelector("#upload-guide__hint-x");
  const uploadGuideHintY = document.querySelector("#upload-guide__hint-y");

  const colorSectionDescription = document.querySelector(
    ".color-section__description",
  );

  mobx.reaction(
    () => viewModel.selectedColorId,
    (selectedColorId) => {
      colorPickerItems.forEach((node) => {
        if (node.dataset.colorId === selectedColorId) {
          // update worker device id
          window.workerDeviceId = node.dataset.deviceId;
          // update color description
          colorSectionDescription.innerText = node.dataset.colorName;

          // highlight color picker
          node.classList.add("color-picker-item--selected");

          // change device image
          deviceImage.src =
            node.dataset.imagePathPortrait ?? node.dataset.imagePathLandscape;

          // change orientation image
          orientationImages[0].src = node.dataset.imagePathPortrait;
          orientationImages[1].src = node.dataset.imagePathLandscape;

          // change credits
          creditsDesc.innerHTML = node.dataset.credits;

          uploadGuideHintX.innerText = node.dataset.displayResolutionX;
          uploadGuideHintY.innerText = node.dataset.displayResolutionY;
        } else {
          node.classList.remove("color-picker-item--selected");
        }
      });
    },
  );
}

function registerUploadGuide() {
  const uploadGuide = document.querySelector(".upload-guide");
  const fileInput = document.querySelector(".upload-guide__file-input");
  uploadGuide.addEventListener("click", () => {
    fileInput.click();
  });
}

function main() {
  const htmlNode = document.querySelector("html");
  const uploadGuideHint = document.querySelector(".upload-guide__hint");
  const fileInput = document.querySelector(".upload-guide__file-input");
  const fileSectionHeading = document.querySelector(".file-uploaded__heading");
  const generateBtn = document.querySelector(".generate-btn");
  const generatingModal = document.querySelector(".generating-modal");
  const cancelMockupBtn = document.querySelector(
    ".generating-modal-dialog__cancel-btn",
  );
  const defaultColorBtn = document.querySelector(
    ".color-picker-item--selected",
  );

  handleColorPickersTooltip();
  registerUploadGuide();

  const fileListViewModel = new FileListViewModel(MAX_FILE_SIZE_BYTE);
  const viewModel = new RootViewModel(
    MAX_MOCKUP_WAIT_SEC,
    fileListViewModel,
    defaultColorBtn?.dataset?.colorId ?? null,
  );
  handleColorPickers(viewModel);
  window.viewModel = viewModel;

  preventDefault(htmlNode, [
    "drag",
    "dragend",
    "dragenter",
    "dragexit",
    "dragleave",
    "dragover",
    "dragstart",
    "drop",
  ]);

  const handlehtmlNodeDragEnter = (e) => {
    dragZoneCounter++;
    viewModel.isFileDragEnter = true;
  };
  const handlehtmlNodeDragLeave = (e) => {
    dragZoneCounter--;
    if (dragZoneCounter === 0) {
      viewModel.isFileDragEnter = false;
    }
  };
  const handlehtmlNodeDrop = async (e) => {
    dragZoneCounter--;
    viewModel.isFileDragEnter = false;
    await viewModel.fileList.add(Array.from(e.dataTransfer.files));
  };

  const handleFileInputChange = async (e) => {
    await viewModel.fileList.add(Array.from(e.target.files));

    // ref https://stackoverflow.com/a/60887378/19287186
    // wordaround to allow upload same files again
    e.target.value = "";
  };

  // observe fileListViewModel: isProcessing
  mobx.autorun(() => {
    if (viewModel.fileList.isProcessing) {
      htmlNode.removeEventListener("dragenter", handlehtmlNodeDragEnter);
      htmlNode.removeEventListener("dragleave", handlehtmlNodeDragLeave);
      htmlNode.removeEventListener("drop", handlehtmlNodeDrop);
      fileInput.removeEventListener("change", handleFileInputChange);
      showUploading();
    } else {
      htmlNode.addEventListener("dragenter", handlehtmlNodeDragEnter);
      htmlNode.addEventListener("dragleave", handlehtmlNodeDragLeave);
      htmlNode.addEventListener("drop", handlehtmlNodeDrop);
      fileInput.addEventListener("change", handleFileInputChange);
      dismissUploading();
    }
  });

  generateBtn.addEventListener("click", () => {
    viewModel.generateMockup();
  });

  cancelMockupBtn.addEventListener("click", () => {
    viewModel.cancelMockup();
  });

  // when some file uploaded/removed
  mobx.reaction(
    () => viewModel.fileList.imageUploads.length,
    () => {
      if (viewModel.fileList.imageUploads.length > 0) {
        fileSectionHeading.innerText = "FILE UPLOADED";
        uploadGuideHint.classList.add("d-none");
      } else {
        fileSectionHeading.innerText = "FILE UPLOAD";
        uploadGuideHint.classList.remove("d-none");
      }
    },
  );
  // observe viewModel: isFileDragEnter
  const dropZoneOverlay = document.querySelector("#drop-zone-overlay");

  mobx.autorun(() => {
    if (viewModel.isFileDragEnter) {
      dropZoneOverlay.classList.add("drop-zone-overlay__show");
    } else {
      dropZoneOverlay.classList.remove("drop-zone-overlay__show");
    }
  });

  // observe fileListViewModel: isReadyForMockup
  mobx.autorun(() => {
    if (viewModel.fileList.isReadyForMockup) {
      generateBtn.disabled = false;
    } else {
      generateBtn.disabled = true;
    }
  });

  // observe fileListViewModel: isGeneratingMockup
  mobx.autorun(() => {
    if (viewModel.isGeneratingMockup) {
      generatingModal.classList.remove("d-none");
    } else {
      generatingModal.classList.add("d-none");
    }
  });

  // observe fileListViewModel: imageUploads[].state
  mobx.reaction(
    () =>
      viewModel.fileList.imageUploads.map((imageUpload) => imageUpload.state),
    async () => {
      const imageUploads = viewModel.fileList.imageUploads;
      for (let i = 0; i < imageUploads.length; ++i) {
        let itemNode = findFileListItem(imageUploads[i].ulid);
        if (itemNode == null) {
          itemNode = appendInitialFileListItem(
            imageUploads[i].ulid,
            imageUploads[i].file.name,
          );
        }
        updateFileListItem(itemNode, imageUploads[i]);
      }
    },
    {
      equals: mobx.comparer.shallow,
    },
  );

  // observe fileListViewModel: imageUploads[].length
  mobx.reaction(
    () => viewModel.fileList.imageUploads.length,
    async () => {
      removeAllFileListItems(); // remove then re-render
      const imageUploads = viewModel.fileList.imageUploads;
      for (let i = 0; i < imageUploads.length; ++i) {
        let itemNode = findFileListItem(imageUploads[i].ulid);
        if (itemNode == null) {
          itemNode = appendInitialFileListItem(
            imageUploads[i].ulid,
            imageUploads[i].file.name,
          );
        }
        updateFileListItem(itemNode, imageUploads[i]);
      }
    },
    {
      equals: mobx.comparer.shallow,
    },
  );

  // observe fileListViewModel: imageUploads[].length increase
  // side effect: generate preview mockup
  mobx.reaction(
    () => viewModel.fileList.imageUploads.length,
    (newLen, oldLen) => {
      // we only want to trigger preview when the length increase
      if (newLen <= oldLen) {
        return;
      }
      if (viewModel.fileList.imageUploads.length !== newLen) {
        console.error("unexpected mobx error, image upload length not matched");
        return;
      }
      const newImage = viewModel.fileList.imageUploads[newLen - 1];
      viewModel.generatePreviewMockup(newImage);
    },
  );

  // observe viewModel: selectedPreviewImageULID
  mobx.reaction(
    () => viewModel.selectedPreviewImageULID,
    () => {
      // update preview area
      const imageContainer = document.querySelector(
        ".upload__device-image-rect",
      );
      if (viewModel.selectedPreviewImageULID === null) {
        imageContainer.style.backgroundImage = "";
        const imageUploadHints = document.querySelectorAll(
          ".upload__device-hint",
        );
        imageUploadHints.forEach((imageUploadHint) => {
          imageUploadHint.style.display = "flex";
        });
      }

      removeAllFileListItems(); // remove then re-render
      const imageUploads = viewModel.fileList.imageUploads;
      for (let i = 0; i < imageUploads.length; ++i) {
        let itemNode = findFileListItem(imageUploads[i].ulid);
        if (itemNode == null) {
          itemNode = appendInitialFileListItem(
            imageUploads[i].ulid,
            imageUploads[i].file.name,
          );
        }
        updateFileListItem(itemNode, imageUploads[i]);

        if (
          imageUploads[i].isSuccessState &&
          imageUploads[i].ulid == window.viewModel.selectedPreviewImageULID
        ) {
          // create a new Image object
          var img_tag = new Image();
          const url = imageUploads[i].previewUrl;
          // when preload is complete, apply the image to the div
          img_tag.onload = function () {
            imageContainer.style.backgroundImage = `url(${url})`;
          };
          // setting 'src' actually starts the preload
          img_tag.src = url;
        }
      }
    },
  );
}
