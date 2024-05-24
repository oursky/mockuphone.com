import * as model from "./model";
import { BrandEnum, DeviceTypeEnum } from "./parse";

export class DeviceManager {
  allDevices: model.Device[];
  allDeviceTypes: model.DeviceType;
  allBrands: model.Brand;

  constructor(
    allDevices: model.Device[],
    allDeviceTypes: model.DeviceType,
    allBrands: model.Brand,
  ) {
    this.allDevices = allDevices;
    this.allDeviceTypes = allDeviceTypes;
    this.allBrands = allBrands;
  }

  public getDeviceById(id: string): model.Device | undefined {
    for (let device of this.allDevices) {
      if (device.device_id === id) {
        return device;
      }
    }
    return undefined;
  }

  public getDeviceListByType(
    deviceType: DeviceTypeEnum | "all",
  ): model.Device[] {
    if (deviceType === "all") {
      return this.allDevices;
    }
    const targetType = this.allDeviceTypes[deviceType];
    return targetType ?? [];
  }

  public getDeviceListByBrand(brand: BrandEnum): model.Device[] {
    const targetBrand = this.allBrands[brand];
    return targetBrand ?? [];
  }

  public getDeviceList(
    deviceType?: DeviceTypeEnum,
    brand?: BrandEnum,
  ): model.Device[] {
    const targetBrand: model.Device[] =
      brand != null ? this.allBrands[brand] ?? [] : [];
    const targetType: model.Device[] =
      deviceType != null ? this.allDeviceTypes[deviceType] ?? [] : [];
    return targetType.filter((d) =>
      targetBrand.map((d) => d.device_id).includes(d.device_id),
    ); // ref https://stackoverflow.com/a/1885569/19287186
  }
}

function makeDeviceManager(
  deviceUrl: string,
  deviceTypeUrl: string,
  brandUrl: string,
): DeviceManager {
  const allDevices = model.parseAllDevices(deviceUrl);
  const allDeviceTypes = model.parseAllDeviceTypes(deviceTypeUrl, allDevices);
  const allBrands = model.parseAllBrands(brandUrl, allDevices);
  return new DeviceManager(allDevices, allDeviceTypes, allBrands);
}

const deviceUrl = "src/scripts/device_info.json";
const deviceTypeUrl = "src/scripts/device_type.json";
const brandUrl = "src/scripts/brand.json";
export const DEVICE_MANAGER = makeDeviceManager(
  deviceUrl,
  deviceTypeUrl,
  brandUrl,
);
