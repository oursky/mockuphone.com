/*
Require: mobx, psd.js
*/

const UploadState = {
  ReadingFile: "ReadingFile",
  ReadyForPresign: "ReadyForPresign",
  Presigning: "Presigning",
  ReadyForUpload: "ReadyForUpload",
  Uploading: "Uploading",
  Uploaded: "Uploaded",
  ErrUnsupportedFileType: "ErrUnsupportedFileType",
  ErrExceedMaxFileSize: "ErrExceedMaxFileSize",
  ErrPresign: "ErrPresign",
  ErrUpload: "ErrUpload",
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
  uploadState = UploadState.ReadingFile;
  message = null;

  loadDimensionPromise = null;

  constructor(file, maxFileSizeByte) {
    mobx.makeObservable(this, {
      file: mobx.observable,
      width: mobx.observable,
      height: mobx.observable,
      uuid: mobx.observable,
      signedData: mobx.observable,
      uploadState: mobx.observable,
      message: mobx.observable,
      isProcessingState: mobx.computed,
      isDoneState: mobx.computed,
      isErrorState: mobx.computed,
    });
    this.file = file;
    this.maxFileSizeByte = maxFileSizeByte;
    if (!this.supportedFileTypes.includes(file.type)) {
      this.uploadState = UploadState.ErrUnsupportedFileType;
      return;
    }
    if (this.maxFileSizeByte != null && this.file.size > this.maxFileSizeByte) {
      this.uploadState = UploadState.ErrExceedMaxFileSize;
      return;
    }

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
      const fr = new FileReader();
      fr.onload = () => {
        PSD.fromURL(fr.result, (psd) => {
          psd.parseImageData();
          mobx.action(() => {
            this.width = psd.image.getImageWidth();
            this.height = psd.image.getImageHeight();
            this.uploadState = UploadState.ReadyForPresign;
          })();

          resolve();
        });
      };
      fr.readAsDataURL(this.file);
    });
  }

  _loadImageDimension() {
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          mobx.action(() => {
            this.width = img.width;
            this.height = img.height;
            this.uploadState = UploadState.ReadyForPresign;
          })();

          resolve();
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(this.file);
    });
  }

  get isProcessingState() {
    return !this.isErrorState && this.uploadState !== UploadState.Uploaded;
  }

  get isDoneState() {
    return this.uploadState === UploadState.Uploaded;
  }

  get isErrorState() {
    return this.uploadState.startsWith("Err");
  }

  get imageFile() {
    return this.file;
  }
}
