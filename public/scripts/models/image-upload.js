/*
Require: mobx, psd.js
*/

const ReadState = {
  ReadyForRead: "ReadyForRead",
  Reading: "Reading",
  ReadSuccess: "ReadSuccess",
  ErrUnsupportedFileType: "ErrUnsupportedFileType",
  ErrExceedMaxFileSize: "ErrExceedMaxFileSize",
  ErrRead: "ErrRead",
};

class ImageUpload {
  maxFileSizeByte = null;
  file = null;
  width = null;
  height = null;
  uuid = null;
  signedData = null;
  readState = ReadState.ReadyForRead;
  message = null;

  loadDimensionPromise = null;

  constructor(file, maxFileSizeByte) {
    mobx.makeObservable(this, {
      file: mobx.observable,
      width: mobx.observable,
      height: mobx.observable,
      uuid: mobx.observable,
      signedData: mobx.observable,
      readState: mobx.observable,
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
    this.readState = ReadState.Reading;
    if (!this._verifyFileType()) {
      this.readState = ReadState.ErrUnsupportedFileType;
      return;
    }
    if (!this._verifyFileSize()) {
      this.readState = ReadState.ErrExceedMaxFileSize;
      return;
    }
    const loadDimensionResult = await this._loadDimension();
    if (loadDimensionResult.type === "failed") {
      this.readState = loadDimensionResult.reason;
      return;
    }
    this.readState = ReadState.ReadSuccess;
  }

  _isPsd() {
    const MIME_TYPES = ["application/x-photoshop", "image/vnd.adobe.photoshop"];
    return MIME_TYPES.includes(this.file.type);
  }

  _isImg() {
    const MIME_TYPES = ["image/jpeg", "image/png"];
    return MIME_TYPES.includes(this.file.type);
  }

  _verifyFileType() {
    return this._isPsd() || this._isImg();
  }

  _verifyFileSize() {
    if (this.maxFileSizeByte != null && this.file.size > this.maxFileSizeByte) {
      return false;
    }
    return true;
  }

  async _loadDimension() {
    if (this._isPsd()) {
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
        resolve({ type: "failed", reason: ReadState.ErrRead });
      };
      fileReader.onerror = () => {
        console.warn("onerror");
        resolve({ type: "failed", reason: ReadState.ErrRead });
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
          resolve({ type: "failed", reason: ReadState.ErrRead });
        };
        img.onabort = () => {
          console.warn("onabort");
          resolve({ type: "failed", reason: ReadState.ErrRead });
        };
        img.src = fileReader.result;
      };
      fileReader.onabort = () => {
        resolve({ type: "failed", reason: ReadState.ErrRead });
      };
      fileReader.onerror = () => {
        console.log("onerror");
        resolve({ type: "failed", reason: ReadState.ErrRead });
      };
      fileReader.readAsDataURL(this.file);
    });
  }

  get isProcessingState() {
    return !this.isProcessedState;
  }

  get isSuccessState() {
    return this.readState === ReadState.ReadSuccess;
  }

  get isProcessedState() {
    return this.isErrorState || this.isSuccessState;
  }

  get isErrorState() {
    return this.readState.startsWith("Err");
  }

  get imageFile() {
    return this.file;
  }
}
