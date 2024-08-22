/*
Require: mobx, psd.js
*/

const ImageUploadState = {
  ReadyForRead: "ReadyForRead",
  Reading: "Reading",
  ReadyForPreview: "ReadyForPreview",
  GeneratingPreview: "GeneratingPreviewImage",
  ReadSuccess: "ReadSuccess",
  ErrUnsupportedFileType: "ErrUnsupportedFileType",
  ErrExceedMaxFileSize: "ErrExceedMaxFileSize",
  ErrRead: "ErrRead",
  ErrPreview: "ErrPreview",
};

class ImageUpload {
  maxFileSizeByte = null;
  file = null;
  width = null;
  height = null;
  uuid = null;
  signedData = null;
  state = ImageUploadState.ReadyForRead;
  message = null;
  ulid = null;
  previewUrl = null;

  loadDimensionPromise = null;

  constructor(file, maxFileSizeByte) {
    mobx.makeObservable(this, {
      file: mobx.observable,
      width: mobx.observable,
      height: mobx.observable,
      uuid: mobx.observable,
      signedData: mobx.observable,
      state: mobx.observable,
      message: mobx.observable,
      isProcessingState: mobx.computed,
      isSuccessState: mobx.computed,
      isProcessedState: mobx.computed,
      isErrorState: mobx.computed,
    });
    this.file = file;
    this.maxFileSizeByte = maxFileSizeByte;
  }

  async read() {
    this.state = ImageUploadState.Reading;
    if (!(await this._verifyFileType())) {
      this.state = ImageUploadState.ErrUnsupportedFileType;
      return;
    }
    if (!this._verifyFileSize()) {
      this.state = ImageUploadState.ErrExceedMaxFileSize;
      return;
    }
    const loadDimensionResult = await this._loadDimension();
    if (loadDimensionResult.type === "failed") {
      this.state = loadDimensionResult.reason;
      return;
    }
    this.state = ImageUploadState.ReadyForPreview;
  }

  updateState(state) {
    this.state = state;
  }

  updatePreviewUrl(previewUrl) {
    this.previewUrl = previewUrl;
  }

  // Cache file type from header such that no need to parse again
  __fileTypeFromHeader = null;
  async _getFileTypeFromHeader() {
    if (this.__fileTypeFromHeader != null) {
      return this.__fileTypeFromHeader;
    }
    const arrayBuffer = await this.file.arrayBuffer();
    const FILE_TYPE_HEADER_BYTES = 4;
    const headerFileTypeBuff = new Uint8Array(arrayBuffer).subarray(
      0,
      FILE_TYPE_HEADER_BYTES,
    );
    let fileTypeFromHeader = "";
    for (let i = 0; i < headerFileTypeBuff.length; i++) {
      fileTypeFromHeader += String.fromCharCode(headerFileTypeBuff[i]);
    }
    this.__fileTypeFromHeader = fileTypeFromHeader;
    return this.__fileTypeFromHeader;
  }

  async _isPsd() {
    const MIME_TYPES = ["application/x-photoshop", "image/vnd.adobe.photoshop"];
    const fileTypesFromHeader = [
      "8BPS", // https://www.fileformat.info/format/psd/egff.htm
    ];
    return (
      MIME_TYPES.includes(this.file.type) ||
      // Windows workaround
      // https://stackoverflow.com/questions/51724649/mime-type-of-file-returning-empty-in-javascript-on-some-machines
      fileTypesFromHeader.includes(await this._getFileTypeFromHeader())
    );
  }

  _isImg() {
    const MIME_TYPES = ["image/jpeg", "image/png"];
    return MIME_TYPES.includes(this.file.type);
  }

  async _verifyFileType() {
    return (await this._isPsd()) || this._isImg();
  }

  _verifyFileSize() {
    if (this.maxFileSizeByte != null && this.file.size > this.maxFileSizeByte) {
      return false;
    }
    return true;
  }

  async _loadDimension() {
    if (await this._isPsd()) {
      return await this._loadPsdDimennsion();
    } else {
      return await this._loadImageDimension();
    }
  }

  _loadPsdDimennsion() {
    return new Promise((resolve) => {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        PSD.fromURL(fileReader.result, (psd) => {
          psd.parseImageData();
          mobx.action(() => {
            this.width = psd.image.getImageWidth();
            this.height = psd.image.getImageHeight();
          })();

          resolve({ type: "success" });
        });
      };
      fileReader.onabort = () => {
        console.warn("onabort");
        resolve({ type: "failed", reason: ImageUploadState.ErrRead });
      };
      fileReader.onerror = () => {
        console.warn("onerror");
        resolve({ type: "failed", reason: ImageUploadState.ErrRead });
      };
      fileReader.readAsDataURL(this.file);
    });
  }

  _loadImageDimension() {
    return new Promise((resolve) => {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const img = new Image();
        img.onload = () => {
          mobx.action(() => {
            this.width = img.width;
            this.height = img.height;
          })();

          resolve({ type: "success" });
        };
        img.onerror = () => {
          console.warn("onerror");
          resolve({ type: "failed", reason: ImageUploadState.ErrRead });
        };
        img.onabort = () => {
          console.warn("onabort");
          resolve({ type: "failed", reason: ImageUploadState.ErrRead });
        };
        img.src = fileReader.result;
      };
      fileReader.onabort = () => {
        resolve({ type: "failed", reason: ImageUploadState.ErrRead });
      };
      fileReader.onerror = () => {
        console.log("onerror");
        resolve({ type: "failed", reason: ImageUploadState.ErrRead });
      };
      fileReader.readAsDataURL(this.file);
    });
  }

  get isGeneratingPreviewState() {
    return this.state === ImageUploadState.GeneratingPreview;
  }

  get isProcessingState() {
    return !this.isProcessedState;
  }

  get isSuccessState() {
    return this.state === ImageUploadState.ReadSuccess;
  }

  get isReadyForPreview() {
    return this.state === ImageUploadState.ReadyForPreview;
  }

  get isProcessedState() {
    return (
      this.isErrorState ||
      this.isSuccessState ||
      this.isGeneratingPreviewState ||
      this.isReadyForPreview
    );
  }

  get isErrorState() {
    return this.state.startsWith("Err");
  }

  get imageFile() {
    return this.file;
  }
}
