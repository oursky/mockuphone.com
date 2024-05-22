import * as model from "./model";

export class DeviceManager {
  deviceCatalog: model.DeviceCatalog;

  constructor(deviceCatalog: model.DeviceCatalog) {
    this.deviceCatalog = deviceCatalog;
  }

  public getDeviceById(id: string): model.Device {
    var targetDevice = {} as model.Device;
    this.deviceCatalog.deviceCatalogArray.filter((deviceCatalogItem) =>
      deviceCatalogItem.deviceSeries.filter((series) => {
        series.device.map((device) => {
          if (device.device_id === id) targetDevice = device;
        });
      }),
    );
    return targetDevice;
  }

  public getDeviceSeriesListByCategory(category: string): model.DeviceSeries[] {
    return this.deviceCatalog.deviceCatalogArray.filter(
      (deviceCatalogItem) => deviceCatalogItem.deviceCatalog === category,
    )[0].deviceSeries;
  }

  public getDevicesBytype(deviceType: string): model.Device[] {
    var targetDeviceList: model.Device[] = [];
    this.deviceCatalog.deviceCatalogArray.filter((deviceCatalogItem) =>
      deviceCatalogItem.deviceSeries.filter((series) => {
        series.device.map((device) => {
          if (device.device_type === deviceType) targetDeviceList.push(device);
        });
      }),
    );
    return targetDeviceList;
  }
}

function makeDeviceManager(url: string): DeviceManager {
  return new DeviceManager(model.parseDeviceCatalog(url));
}

const url = "src/scripts/device_info.json";
export const DEVICE_MANAGER = makeDeviceManager(url);
