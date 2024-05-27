import * as model from "./model";
import { BrandEnum, DeviceTypeEnum, ModelEnum } from "./parse";

export class DeviceManager {
  allDevices: model.Device[];
  allDeviceTypes: model.DeviceType;
  allBrands: model.Brand;
  allDeviceModels: model.Model;

  constructor(
    allDevices: model.Device[],
    allDeviceTypes: model.DeviceType,
    allBrands: model.Brand,
    allDeviceModels: model.Model,
  ) {
    this.allDevices = allDevices;
    this.allDeviceTypes = allDeviceTypes;
    this.allBrands = allBrands;
    this.allDeviceModels = allDeviceModels;
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

  public getDeviceListByLegacyType(legacyType: string): model.Device[] {
    return this.allDevices.filter(
      (device) => device.device_type === legacyType,
    );
  }

  public getDeviceListByModel(model: ModelEnum): model.Device[] {
    const targetModel = this.allDeviceModels[model];
    return targetModel ?? [];
  }

  public getDeviceThumbnailByModel(model: ModelEnum): model.Device | undefined {
    const targetModel: model.Device[] | undefined = this.allDeviceModels[model];
    if (targetModel == null || targetModel.length === 0) {
      return undefined;
    }
    return targetModel[0];
  }

  public getDeviceListByBrand(brand: BrandEnum): model.Device[] {
    const targetBrand = this.allBrands[brand];
    return targetBrand ?? [];
  }

  public getDeviceList(
    deviceType?: DeviceTypeEnum | "all",
    brand?: BrandEnum,
  ): model.Device[] {
    if (brand == null || deviceType == null) {
      return [];
    }
    if (this.allBrands[brand] == null) {
      return [];
    }

    const targetBrand: model.Device[] = this.allBrands[brand];
    const targetType: model.Device[] =
      deviceType === "all"
        ? this.allDevices
        : this.allDeviceTypes[deviceType] ?? [];
    return targetType.filter((d) =>
      targetBrand.map((d) => d.device_id).includes(d.device_id),
    ); // ref https://stackoverflow.com/a/1885569/19287186
  }

  public getBrandDeviceList(
    deviceType: DeviceTypeEnum | "all",
  ): Partial<Record<BrandEnum, model.Device[]>> {
    let result: Partial<Record<BrandEnum, model.Device[]>> = {};
    BrandEnum.options.forEach((b: BrandEnum) => {
      const devices = this.getDeviceList(deviceType, b);
      result[b] = devices;
    });
    return result;
  }
}

function makeDeviceManager(
  deviceUrl: string,
  deviceTypeUrl: string,
  brandUrl: string,
  deviceModelUrl: string,
): DeviceManager {
  const allDevices = model.parseAllDevices(deviceUrl);
  const allDeviceTypes = model.parseAllDeviceTypes(deviceTypeUrl, allDevices);
  const allBrands = model.parseAllBrands(brandUrl, allDevices);
  const allDeviceModels = model.parseAllModels(deviceModelUrl, allDevices);
  return new DeviceManager(
    allDevices,
    allDeviceTypes,
    allBrands,
    allDeviceModels,
  );
}

const DEVICE_URL = "src/scripts/device_info.json";
const DEVICE_TYPE_URL = "src/scripts/device_type.json";
const BRAND_URL = "src/scripts/brand.json";
const DEVICE_MODEL_URL = "src/scripts/device_model.json";

export const DEVICE_MANAGER = makeDeviceManager(
  DEVICE_URL,
  DEVICE_TYPE_URL,
  BRAND_URL,
  DEVICE_MODEL_URL,
);
