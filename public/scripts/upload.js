/*
Require: mobx,
         utils/images.js, services/presign.js, models/image-upload.js
*/
const isDebug = false;
const maxFileSizeByte = 104857600;
const maxFileSizeReadable = "100 MB";
const maxMockupWaitSec = 1000000000;

function ready(fn) {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
ready(main);

async function runWorker(worker) {
  imageUploadList = viewModel.fileList._imageUploads.map(
    (item) => item.imageFile,
  );
  worker.postMessage({
    imageUploadList: imageUploadList,
    location: window.location.toString(),
    deviceInfo: window.deviceInfo,
  });
  worker.addEventListener(
    "message",
    function (e) {
      window.pictureArray = e.data;
      window.localforage
        .setItem("pictureArray", e.data)
        .then(function (pictureArray) {
          window.location.href = "/download";
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
    });
    this.maxFileSizeByte = maxFileSizeByte;
    this._changeState();
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
      this._imageUploads.some((imageUpload) => imageUpload.isDoneState)
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
      const imageUpload = new ImageUpload(file, maxFileSizeByte);
      await imageUpload.loadDimensionPromise;

      this._imageUploads.push(imageUpload);
    }
  }

  _changeState() {
    mobx.reaction(
      () => this.imageUploads.map((imageUpload) => imageUpload.uploadState),
      () => {
        const tasks = [];
        for (const imageUpload of this._imageUploads) {
          imageUpload.uploadState = UploadState.Uploaded;
        }
      },
      {
        equals: mobx.comparer.shallow,
      },
    );
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

  constructor(maxMockupWaitSec, fileListViewModel) {
    mobx.makeObservable(this, {
      isFileDragEnter: mobx.observable,
      _isGeneratingMockup: mobx.observable,
      isGeneratingMockup: mobx.computed,
      generateMockup: mobx.action,
      cancelMockup: mobx.action,
    });
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
    return "/download/";
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
  uploading.classList.add("d-none");
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

  const filenameNode = document.createElement("div");
  filenameNode.classList.add("file-list-item__filename");
  filenameNode.innerText = filename;
  itemNode.appendChild(filenameNode);

  itemNode.insertAdjacentHTML(
    "beforeend",
    `<p class="file-list-item__hint"></p>`,
  );

  itemNode.insertAdjacentHTML(
    "beforeend",
    `<div class="file-list-item__progress-bar-border">
      <div class="file-list-item__progress-bar-fill"></div>
    </div>`,
  );

  return fileListNode.appendChild(itemNode);
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
    imageUpload.uploadState !== UploadState.ReadingFile && !isCorrectDim;
  // Update status icon
  // error status has higher precedence over warning
  if (imageUpload.isErrorState) {
    itemNode.classList.remove("file-list-item--progress");
    itemNode.classList.add("file-list-item--error");
  } else if (shouldShowAspectRatioWarning) {
    itemNode.classList.add("file-list-item--warning");
  }
  if (imageUpload.isDoneState) {
    setTimeout(() => {
      itemNode.classList.remove("file-list-item--progress");
    }, 10);
    itemNode.classList.add("file-list-item--done");
  } else if (imageUpload.isProcessingState) {
    itemNode.classList.add("file-list-item--progress");
  }
  // update hint text
  if (imageUpload.isErrorState) {
    switch (imageUpload.uploadState) {
      case UploadState.ErrUnsupportedFileType:
        hintNode.innerText = "File extensions should be in JPG, PNG or PSD.";
        break;
      case UploadState.ErrExceedMaxFileSize:
        hintNode.innerText = `File size should be less than ${maxFileSizeReadable}.`;
        break;
      case UploadState.ErrPresign:
      case UploadState.ErrUpload:
      default:
        hintNode.innerText =
          "Something went wrong. Please try upload again or refresh the page.";
        break;
    }
  } else if (shouldShowAspectRatioWarning) {
    hintNode.innerText = `This file has a different aspect ratio than ${recommendAspectRatio.toPrecision(
      3,
    )} (ideally ${recommendDim.width}px * ${recommendDim.height}px).`;
  }
  // update progress bar
  if (imageUpload.isProcessingState || imageUpload.isDoneState) {
    switch (imageUpload.uploadState) {
      case UploadState.ReadingFile:
      case UploadState.ReadyForPresign:
        progressFillNode.classList.add("file-list-item__progress-bar-fill--30");
        break;
      case UploadState.Presigning:
      case UploadState.ReadyForUpload:
        progressFillNode.classList.add("file-list-item__progress-bar-fill--60");
        break;
      case UploadState.Uploading:
        progressFillNode.classList.add("file-list-item__progress-bar-fill--90");
        break;
      case UploadState.Uploaded:
        progressFillNode.classList.add(
          "file-list-item__progress-bar-fill--100",
        );
        break;
      default:
        break;
    }
  }
}

function main() {
  const uploadForm = document.querySelector(".upload");
  const uploadBtn = document.querySelector(".upload-guide__browse-btn");
  const fileInput = document.querySelector(".upload-guide__file-input");
  const fileSection = document.querySelector(".file-uploaded");
  const generateBtn = document.querySelector(".generate-btn");
  const generatingModal = document.querySelector(".generating-modal");
  const cancelMockupBtn = document.querySelector(
    ".generating-modal-dialog__cancel-btn",
  );

  const fileListViewModel = new FileListViewModel(maxFileSizeByte);
  const viewModel = new RootViewModel(maxMockupWaitSec, fileListViewModel);

  window.viewModel = viewModel;
  if (isDebug) {
    window.viewModel = viewModel;
  }

  preventDefault(uploadForm, [
    "drag",
    "dragend",
    "dragenter",
    "dragexit",
    "dragleave",
    "dragover",
    "dragstart",
    "drop",
  ]);

  const handleUploadFormDragEnter = (e) => {
    viewModel.isFileDragEnter = true;
  };
  const handleUploadFormDragLeave = (e) => {
    if (e.target.isSameNode(uploadForm)) {
      viewModel.isFileDragEnter = false;
    }
  };
  const handleUploadFormDrop = async (e) => {
    viewModel.isFileDragEnter = false;
    await viewModel.fileList.add(Array.from(e.dataTransfer.files));
  };
  const handleUploadBtnClick = (e) => {
    fileInput.click();
  };
  const handleFileInputChange = async (e) => {
    await viewModel.fileList.add(Array.from(e.target.files));
    uploadForm.reset();
  };

  // observe fileListViewModel: isProcessing
  mobx.autorun(() => {
    if (viewModel.fileList.isProcessing) {
      uploadForm.removeEventListener("dragenter", handleUploadFormDragEnter);
      uploadForm.removeEventListener("dragleave", handleUploadFormDragLeave);
      uploadForm.removeEventListener("drop", handleUploadFormDrop);
      uploadBtn.removeEventListener("click", handleUploadBtnClick);
      fileInput.removeEventListener("change", handleFileInputChange);
      showUploading();
    } else {
      uploadForm.addEventListener("dragenter", handleUploadFormDragEnter);
      uploadForm.addEventListener("dragleave", handleUploadFormDragLeave);
      uploadForm.addEventListener("drop", handleUploadFormDrop);
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

  // when some file uploaded, show file section
  mobx.when(
    () => viewModel.fileList.imageUploads.length > 0,
    () => {
      fileSection.classList.remove("d-none");
    },
  );

  // observe viewModel: isFileDragEnter
  mobx.autorun(() => {
    if (viewModel.isFileDragEnter) {
      uploadForm.classList.add("upload--dragenter");
    } else {
      uploadForm.classList.remove("upload--dragenter");
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

  // observe fileListViewModel: imageUploads[].uploadState
  mobx.reaction(
    () =>
      viewModel.fileList.imageUploads.map(
        (imageUpload) => imageUpload.uploadState,
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
    },
    {
      equals: mobx.comparer.shallow,
    },
  );

  if (isDebug) {
    // observe fileListViewModel: imageUploads, imageUploads[].uploadState
    mobx.autorun(() => {
      console.log("file list:", mobx.toJS(viewModel.fileList.imageUploads));
      console.log(
        "upload states:",
        viewModel.fileList.imageUploads.map(
          (imageUpload) => imageUpload.uploadState,
        ),
      );
    });
  }
}

function sleep(delay) {
  return new Promise((resolve) => setTimeout(() => resolve(), delay));
}
