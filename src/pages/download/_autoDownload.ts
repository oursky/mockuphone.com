export function readyForAutoDownload(fn: () => void): void {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

// TODO: Add type definition
export function mainForAutoDownload(): void {
  generateZIP((window as any).targetDeviceId);
}
