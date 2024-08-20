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
          // TODO: Handle preview error in widget
          console.error("Get error while storing images to localforage:", err);
        });
    },
    false,
  );
}

function runPreviewWorker(worker, imageUpload) {
  if (imageUpload.isErrorState) {
    return;
  }
  window.viewModel.fileList.updateImageUploadStateByULID(
    imageUpload.ulid,
    ImageUploadState.GeneratingPreview,
  );
  const imageUploadFile = imageUpload.file;
  worker.postMessage({
    imageUpload: imageUploadFile,
    location: window.location.toString(),
    deviceId: window.workerDeviceId,
    deviceInfo: window.deviceInfo,
    ulid: imageUpload.ulid,
  });
  worker.addEventListener(
    "message",
    function (e) {
      window.localforage
        .setItem(`previewImage-${e.data["ulid"]}`, e.data["results"][1])
        .then(function () {
          const imageContainer = document.querySelector(
            ".upload__device-image-rect",
          );

          /* Put first generated mockup to preview area */
          if (!imageContainer.style.backgroundImage) {
            imageContainer.style.backgroundImage = `url(${e.data["results"][1]})`;

            const imageUploadHints = document.querySelectorAll(
              ".upload__device-hint",
            );
            imageUploadHints.forEach((imageUploadHint) => {
              imageUploadHint.style.display = "none";
            });
          }
          window.viewModel.fileList.updateImageUploadPreviewUrlByULID(
            e.data["ulid"],
            e.data["results"][1],
          );
          window.viewModel.fileList.updateImageUploadStateByULID(
            e.data["ulid"],
            ImageUploadState.ReadSuccess,
          );
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

    for (let i = 0; i < files.length; i += 1) {
      const imageUpload = new ImageUpload(files[i], MAX_FILE_SIZE_BYTE);
      await imageUpload.read();
      imageUpload.ulid = ULID.ulid();

      // Avoiding read same image file
      setTimeout(() => {
        this._imageUploads.push(imageUpload);
        window.viewModel.generatePreviewMockup(imageUpload);
      }, i * 10);
    }

    window.viewModel.selectedPreviewImageULID =
      window.viewModel.defaultImageUploadULID;
  }

  async remove(filename, fileUlid) {
    this._imageUploads = this._imageUploads.filter((upload) => {
      const isSameFilename = upload.file.name === filename;
      const isSameULID = fileUlid === upload.ulid;
      return !(isSameFilename && isSameULID);
    });

    window.viewModel.selectedPreviewImageULID =
      window.viewModel.defaultImageUploadULID;
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
  _socket = null;
  _redirectTimer = null;
  worker = new Worker("/scripts/web_worker.js");
  previewWorker = new Worker("/scripts/preview_worker.js");
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
  }

  get isGeneratingMockup() {
    return this._isGeneratingMockup;
  }

  async generatePreviewMockup(imageUpload) {
    runPreviewWorker(this.previewWorker, imageUpload);
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

  get defaultImageUploadULID() {
    return this.fileList.imageUploads.length > 0
      ? this.fileList.imageUploads[0].ulid
      : null;
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
  previewStateNode.addEventListener("click", () => {
    window.viewModel.selectedPreviewImageULID = fileUlid;
  });

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
  crossNode.onclick = async () => {
    await window.viewModel.fileList.remove(filename, fileUlid);
  };
  headerNode.appendChild(crossNode);

  fileInfoNode.appendChild(headerNode);
  fileInfoNode.insertAdjacentHTML(
    "beforeend",
    `<p class="file-list-item__hint d-none"></p>`,
  );

  fileInfoNode.insertAdjacentHTML(
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
  const previewNode = itemNode.querySelector(".file-list-item__preview-state");

  // clear previous state
  itemNode.classList.remove(
    "file-list-item--done",
    "file-list-item--error",
    "file-list-item--warning",
    "file-list-item__previewable",
    // NOTE: do not remove progress state immediately so the progress bar can proceed to 100% before being removed
    // "file-list-item--progress"
  );
  progressFillNode.classList.remove(
    "file-list-item__progress-bar-fill--30",
    "file-list-item__progress-bar-fill--60",
    "file-list-item__progress-bar-fill--90",
    "file-list-item__progress-bar-fill--100",
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
    imageUpload.state !== ImageUploadState.Reading && !isCorrectDim;
  // Update status icon
  // error status has higher precedence over warning
  if (imageUpload.isErrorState) {
    itemNode.classList.remove("file-list-item--progress");
    itemNode.classList.add("file-list-item--error");
  } else if (shouldShowAspectRatioWarning) {
    itemNode.classList.add("file-list-item--warning");
  }

  if (imageUpload.isGeneratingPreviewState) {
    itemNode.classList.remove("file-list-item--done");
    itemNode.classList.add("file-list-item--loading");
  }

  if (imageUpload.isSuccessState) {
    itemNode.classList.remove(
      "file-list-item--loading",
      "file-list-item--progress",
    );
    itemNode.classList.add(
      "file-list-item--done",
      "file-list-item__previewable",
    );
  } else if (imageUpload.isProcessingState) {
    itemNode.classList.add("file-list-item--progress");
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
      case ImageUploadState.ErrRead:
      default:
        hintNode.innerText =
          "Something went wrong. Please try upload again or refresh the page.";
        break;
    }
  } else if (shouldShowAspectRatioWarning) {
    hintNode.innerText = `Uploaded file dimension (${imageDim.width} × ${imageDim.height} pixels) differs from ideal (${recommendDim.width} × ${recommendDim.height} pixels).`;
  }
  // update progress bar
  if (
    imageUpload.isProcessingState ||
    imageUpload.isSuccessState ||
    imageUpload.isGeneratingMockupState
  ) {
    progressFillNode.classList.add("file-list-item__progress-bar-fill--30");
    switch (imageUpload.state) {
      case ImageUploadState.ReadyForRead:
        progressFillNode.classList.add("file-list-item__progress-bar-fill--60");
        break;
      case ImageUploadState.Reading:
        progressFillNode.classList.add("file-list-item__progress-bar-fill--90");
        break;
      case ImageUploadState.ReadSuccess:
      case ImageUploadState.GeneratingPreview:
        progressFillNode.classList.add(
          "file-list-item__progress-bar-fill--100",
        );
        break;
      default:
        break;
    }
  }

  // update preview button
  if (imageUpload.isSuccessState) {
    if (window.viewModel.selectedPreviewImageULID == imageUpload.ulid) {
      previewNode.classList.add("file-list-item__preview_selected");
    } else {
      previewNode.classList.add("file-list-item__preview_non_selected");
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

      // scroll to upload element on mobile devices
      if (window.innerWidth <= 992) {
        const HEADER_HEIGHT = 80;
        scrollToElementTop(uploadSection, HEADER_HEIGHT);
      }
    },
    {
      equals: mobx.comparer.shallow,
    },
  );

  // observe fileListViewModel: imageUploads[].previewState
  mobx.reaction(
    () =>
      viewModel.fileList.imageUploads.map(
        (imageUpload) => imageUpload.previewState,
      ),
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

      // scroll to upload element on mobile devices
      if (window.innerWidth <= 992) {
        const HEADER_HEIGHT = 80;
        scrollToElementTop(uploadSection, HEADER_HEIGHT);
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
          imageContainer.style.backgroundImage = `url(${imageUploads[i].previewUrl})`;
        }
      }
    },
  );

  if (isDebug) {
    // observe fileListViewModel: imageUploads, imageUploads[].state
    mobx.autorun(() => {
      console.log("file list:", mobx.toJS(viewModel.fileList.imageUploads));
      console.log(
        "read states:",
        viewModel.fileList.imageUploads.map((imageUpload) => imageUpload.state),
      );
    });
  }
}

function sleep(delay) {
  return new Promise((resolve) => setTimeout(() => resolve(), delay));
}
