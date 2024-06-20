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
  supportedFileTypes = [
    "application/x-photoshop",
    "image/vnd.adobe.photoshop",
    "image/jpeg",
    "image/png",
  ];
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
    if (!this.supportedFileTypes.includes(file.type)) {
      this.readState = ReadState.ErrUnsupportedFileType;
      return;
    }
    if (this.maxFileSizeByte != null && this.file.size > this.maxFileSizeByte) {
      this.readState = ReadState.ErrExceedMaxFileSize;
      return;
    }
    this.readState = ReadState.Reading;
    this.loadDimensionPromise = this._loadDimension();
  }

  async _loadDimension() {
    if (
      this.file.type === "image/vnd.adobe.photoshop" ||
      this.file.type === "application/x-photoshop"
    ) {
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
            this.readState = ReadState.ReadSuccess;
          })();

          resolve({ type: "success" });
        });
      };
      fileReader.onabort = () => {
        console.warn("onabort");
        mobx.action(() => {
          this.readState = ReadState.ErrRead;
        })();
        resolve({ type: "failed", reason: ReadState.ErrRead });
      };
      fileReader.onerror = () => {
        console.warn("onerror");
        mobx.action(() => {
          this.readState = ReadState.ErrRead;
        })();
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
            this.readState = ReadState.ReadSuccess;
          })();

          resolve({ type: "success" });
        };
        img.onerror = () => {
          console.warn("onerror");
          mobx.action(() => {
            this.readState = ReadState.ErrRead;
          })();
          resolve({ type: "failed", reason: ReadState.ErrRead });
        };
        img.onabort = () => {
          console.warn("onabort");
          mobx.action(() => {
            this.readState = ReadState.ErrRead;
          })();
          resolve({ type: "failed", reason: ReadState.ErrRead });
        };
        img.src = fileReader.result;
      };
      fileReader.onabort = () => {
        mobx.action(() => {
          this.readState = ReadState.ErrRead;
        })();
        resolve({ type: "failed", reason: ReadState.ErrRead });
      };
      fileReader.onerror = () => {
        console.log("onerror");
        mobx.action(() => {
          this.readState = ReadState.ErrRead;
        })();
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
