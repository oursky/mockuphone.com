/*
Require: mobx,
         utils/images.js, utils/scroll.js, services/presign.js, models/image-upload.js
*/
let dragZoneCounter = 0; // https://stackoverflow.com/a/21002544/19287186
const isDebug = false;
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
          window.location.href = "/download/?deviceId=" + window.workerDeviceId;
        })
        .catch(function (err) {
          console.error("Get error while storing images to localforage:", err);
        });
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

    for (const file of files) {
      const imageUpload = new ImageUpload(file, MAX_FILE_SIZE_BYTE);
      if (imageUpload.loadDimensionPromise != null) {
        await imageUpload.loadDimensionPromise;
      }
      this._imageUploads.push(imageUpload);
    }
  }

  async remove(filename, index) {
    this._imageUploads = this._imageUploads.filter((upload, i) => {
      const isSameFilename = upload.file.name === filename;
      const isSameIndex = i === index;
      return !(isSameFilename && isSameIndex);
    });
  }
}

class RootViewModel {
  maxMockupWaitSec;
  fileList;
  isFileDragEnter = false;
  _isGeneratingMockup = false;
  _socket = null;
  _redirectTimer = null;
  worker = new Worker("/scripts/web_worker.js");
  selectedColorId = null;

  constructor(maxMockupWaitSec, fileListViewModel, selectedColorId) {
    mobx.makeObservable(this, {
      selectedColorId: mobx.observable,
      isFileDragEnter: mobx.observable,
      _isGeneratingMockup: mobx.observable,
      isGeneratingMockup: mobx.computed,
      generateMockup: mobx.action,
      cancelMockup: mobx.action,
    });
    this.selectedColorId = selectedColorId;
    this.maxMockupWaitSec = maxMockupWaitSec;
    this.fileList = fileListViewModel;
  }

  get isGeneratingMockup() {
    return this._isGeneratingMockup;
  }

  async generateMockup() {
    if (!this.fileList.isReadyForMockup) {
      console.warn("Cannot generate mockup at this moment");
      return;
    }
    this._isGeneratingMockup = true;
    runWorker(this.worker);
  }

  _prepareMockup() {
    this._scheduleRedirect(0);
  }

  cancelMockup() {
    if (!this.isGeneratingMockup) {
      return;
    }
    this._cancelScheduleRedirect();
    this._socket = null;
    this._isGeneratingMockup = false;
    this.worker.terminate();
    this.worker = new Worker("/scripts/web_worker.js");
  }

  _scheduleRedirect(sec) {
    this._redirectTimer = setTimeout(() => {
      window.location.replace(this.previewUrl);
    }, sec * 1000);
  }

  _cancelScheduleRedirect() {
    if (this._redirectTimer != null) {
      clearTimeout(this._redirectTimer);
      this._redirectTimer = null;
    }
  }

  get previewUrl() {
    return "/download/?deviceId=" + window.workerDeviceId;
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

function findFileListItem(fileIndex) {
  const fileListNode = document.querySelector(".file-list");
  const itemNodes = fileListNode.querySelectorAll(".file-list-item");
  for (const itemNode of itemNodes) {
    if (itemNode.dataset.fileIndex === String(fileIndex)) {
      return itemNode;
    }
  }
  return null;
}

function appendInitialFileListItem(fileIndex, filename) {
  const fileListNode = document.querySelector(".file-list");

  const itemNode = document.createElement("li");
  itemNode.classList.add("file-list-item");
  itemNode.dataset.fileIndex = fileIndex;

  const headerNode = document.createElement("div");
  headerNode.classList.add("file-list-item__filename");
  const filenameNode = document.createElement("span");
  filenameNode.innerText = filename;
  filenameNode.classList.add("file-list-item__filename-content");
  headerNode.appendChild(filenameNode);

  const crossNode = document.createElement("button");
  crossNode.classList.add("file-list-item__cross");
  crossNode.onclick = async () => {
    await window.viewModel.fileList.remove(filename, fileIndex);
  };
  headerNode.appendChild(crossNode);

  itemNode.appendChild(headerNode);

  itemNode.insertAdjacentHTML(
    "beforeend",
    `<p class="file-list-item__hint d-none"></p>`,
  );

  itemNode.insertAdjacentHTML(
    "beforeend",
    `<div class="file-list-item__progress-bar-border">
      <div class="file-list-item__progress-bar-fill"></div>
    </div>`,
  );

  return fileListNode.appendChild(itemNode);
}

function removeAllFileListItems() {
  const fileListNode = document.querySelector(".file-list");
  fileListNode.replaceChildren();
}

function updateFileListItem(itemNode, imageUpload) {
  const hintNode = itemNode.querySelector(".file-list-item__hint");
  const progressFillNode = itemNode.querySelector(
    ".file-list-item__progress-bar-fill",
  );

  // clear previous state
  itemNode.classList.remove(
    "file-list-item--done",
    "file-list-item--error",
    "file-list-item--warning",
    // NOTE: do not remove progress state immediately so the progress bar can proceed to 100% before being removed
    // "file-list-item--progress"
  );
  progressFillNode.classList.remove(
    "file-list-item__progress-bar-fill--30",
    "file-list-item__progress-bar-fill--60",
    "file-list-item__progress-bar-fill--90",
    "file-list-item__progress-bar-fill--100",
  );

  /* Expected UI for each state
|              | error (correct ratio) | error (wrong ratio) | processing (correct ratio) | processing (wrong ratio) | done (correct ratio) | done (wrong ratio) |
|--------------|:---------------------:|:-------------------:|:--------------------------:|:------------------------:|:--------------------:|:------------------:|
| error icon   |           y           |          y          |                            |                          |                      |                    |
| warning icon |                       |                     |                            |            y             |                      |         y          |
| done icon    |                       |                     |                            |                          |          y           |                    |
| hint text    |      error hint       |     error hint      |                            |        ratio hint        |                      |     ratio hint     |
| progress bar |                       |                     |             y              |            y             |                      |                    |
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
    imageUpload.readState !== ReadState.Reading && !isCorrectDim;
  // Update status icon
  // error status has higher precedence over warning
  if (imageUpload.isErrorState) {
    itemNode.classList.remove("file-list-item--progress");
    itemNode.classList.add("file-list-item--error");
  } else if (shouldShowAspectRatioWarning) {
    itemNode.classList.add("file-list-item--warning");
  }
  if (imageUpload.isSuccessState) {
    setTimeout(() => {
      itemNode.classList.remove("file-list-item--progress");
    }, 10);
    itemNode.classList.add("file-list-item--done");
  } else if (imageUpload.isProcessingState) {
    itemNode.classList.add("file-list-item--progress");
  }
  // update hint text
  if (imageUpload.isErrorState) {
    switch (imageUpload.readState) {
      case ReadState.ErrUnsupportedFileType:
        hintNode.innerText = "Supported file extensions: JPG, PNG or PSD.";
        break;
      case ReadState.ErrExceedMaxFileSize:
        hintNode.innerText = `File size should be less than ${MAX_FILE_SIZE_READABLE}.`;
        break;
      case ReadState.ErrRead:
      default:
        hintNode.innerText =
          "Something went wrong. Please try upload again or refresh the page.";
        break;
    }
  } else if (shouldShowAspectRatioWarning) {
    hintNode.innerText = `Uploaded file dimension (${imageDim.width} × ${imageDim.height} pixels) differs from ideal (${recommendDim.width} × ${recommendDim.height} pixels).`;
  }
  // update progress bar
  if (imageUpload.isProcessingState || imageUpload.isSuccessState) {
    progressFillNode.classList.add("file-list-item__progress-bar-fill--30");
    switch (imageUpload.readState) {
      case ReadState.ReadyForRead:
        progressFillNode.classList.add("file-list-item__progress-bar-fill--60");
        break;
      case ReadState.Reading:
        progressFillNode.classList.add("file-list-item__progress-bar-fill--90");
        break;
      case ReadState.ReadSuccess:
        progressFillNode.classList.add(
          "file-list-item__progress-bar-fill--100",
        );
        break;
      default:
        break;
    }
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
  const uploadSection = document.querySelector("#above-file-uploaded");
  const uploadBtn = document.querySelector(".upload-guide__browse-btn");
  const uploadGuideHint = document.querySelector(".upload-guide__hint");
  const fileInput = document.querySelector(".upload-guide__file-input");
  const fileSectionHeading = document.querySelector(".file-uploaded__heading");
  const generateBtn = document.querySelector(".generate-btn");
  const generatingModal = document.querySelector(".generating-modal");
  const cancelMockupBtn = document.querySelector(
    ".generating-modal-dialog__cancel-btn",
  );

  handleColorPickersTooltip();
  registerUploadGuide();

  const fileListViewModel = new FileListViewModel(MAX_FILE_SIZE_BYTE);
  const viewModel = new RootViewModel(
    MAX_MOCKUP_WAIT_SEC,
    fileListViewModel,
    "blue",
  );
  handleColorPickers(viewModel);
  window.viewModel = viewModel;
  if (isDebug) {
    window.viewModel = viewModel;
  }

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
  const handleUploadBtnClick = (e) => {
    fileInput.click();
  };
  const handleFileInputChange = async (e) => {
    await viewModel.fileList.add(Array.from(e.target.files));
    htmlNode.reset();
  };

  // observe fileListViewModel: isProcessing
  mobx.autorun(() => {
    if (viewModel.fileList.isProcessing) {
      htmlNode.removeEventListener("dragenter", handlehtmlNodeDragEnter);
      htmlNode.removeEventListener("dragleave", handlehtmlNodeDragLeave);
      htmlNode.removeEventListener("drop", handlehtmlNodeDrop);
      uploadBtn.removeEventListener("click", handleUploadBtnClick);
      fileInput.removeEventListener("change", handleFileInputChange);
      showUploading();
    } else {
      htmlNode.addEventListener("dragenter", handlehtmlNodeDragEnter);
      htmlNode.addEventListener("dragleave", handlehtmlNodeDragLeave);
      htmlNode.addEventListener("drop", handlehtmlNodeDrop);
      uploadBtn.addEventListener("click", handleUploadBtnClick);
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

  // observe fileListViewModel: imageUploads[].readState
  mobx.reaction(
    () =>
      viewModel.fileList.imageUploads.map(
        (imageUpload) => imageUpload.readState,
      ),
    async () => {
      const imageUploads = viewModel.fileList.imageUploads;
      for (let i = 0; i < imageUploads.length; ++i) {
        let itemNode = findFileListItem(i);
        if (itemNode == null) {
          itemNode = appendInitialFileListItem(i, imageUploads[i].file.name);
        }
        updateFileListItem(itemNode, imageUploads[i]);
      }
      const HEADER_HEIGHT = 80;
      scrollToElementTop(uploadSection, HEADER_HEIGHT);
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
        let itemNode = findFileListItem(i);
        if (itemNode == null) {
          itemNode = appendInitialFileListItem(i, imageUploads[i].file.name);
        }
        updateFileListItem(itemNode, imageUploads[i]);
      }
    },
    {
      equals: mobx.comparer.shallow,
    },
  );

  if (isDebug) {
    // observe fileListViewModel: imageUploads, imageUploads[].readState
    mobx.autorun(() => {
      console.log("file list:", mobx.toJS(viewModel.fileList.imageUploads));
      console.log(
        "read states:",
        viewModel.fileList.imageUploads.map(
          (imageUpload) => imageUpload.readState,
        ),
      );
    });
  }
}

function sleep(delay) {
  return new Promise((resolve) => setTimeout(() => resolve(), delay));
}
