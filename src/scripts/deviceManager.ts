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

  public get allModelThumbnails(): model.ModelThumbnail[] {
    return Object.keys(this.allDeviceModels).flatMap((m: string) => {
      const modelKey = ModelEnum.parse(m);
      return model.mapModelThumbnails([modelKey], this.allDeviceModels);
    });
  }

  public getDeviceById(id: string): model.Device | undefined {
    for (let device of this.allDevices) {
      if (device.device_id === id) {
        return device;
      }
    }
    return undefined;
  }

  public getModelThumbnailListByType(
    deviceType: DeviceTypeEnum | "all",
  ): model.ModelThumbnail[] {
    if (deviceType === "all") {
      return this.allModelThumbnails;
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
    return targetModel == null ? [] : targetModel.devices;
  }

  public getDeviceThumbnailByModel(
    model: ModelEnum,
  ): model.ModelThumbnail | undefined {
    const targetModel: model.ModelValue | undefined =
      this.allDeviceModels[model];
    if (targetModel == null || targetModel.devices.length === 0) {
      return undefined;
    }
    return {
      modelId: targetModel.id,
      modelName: targetModel.name,
      device: targetModel.devices[0],
    };
  }

  public getModelThumbnailListByBrand(
    brand: BrandEnum,
  ): model.ModelThumbnail[] {
    const targetBrand = this.allBrands[brand];
    return targetBrand ?? [];
  }

  public getModelThumbnailList(
    deviceType?: DeviceTypeEnum | "all",
    brand?: BrandEnum,
  ): model.ModelThumbnail[] {
    if (brand == null || deviceType == null) {
      return [];
    }
    if (this.allBrands[brand] == null) {
      return [];
    }

    const targetBrand: model.ModelThumbnail[] = this.allBrands[brand];
    const targetType: model.ModelThumbnail[] =
      deviceType === "all"
        ? this.allModelThumbnails
        : this.allDeviceTypes[deviceType] ?? [];
    return targetType.filter((value) =>
      targetBrand.map((value) => value.modelId).includes(value.modelId),
    ); // ref https://stackoverflow.com/a/1885569/19287186
  }

  public getBrandModelThumbnailList(
    deviceType: DeviceTypeEnum | "all",
  ): Partial<Record<BrandEnum, model.ModelThumbnail[]>> {
    let result: Partial<Record<BrandEnum, model.ModelThumbnail[]>> = {};
    BrandEnum.options.forEach((b: BrandEnum) => {
      const thumbnails = this.getModelThumbnailList(deviceType, b);
      result[b] = thumbnails;
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
  const allDeviceModels = model.parseAllModels(deviceModelUrl, allDevices);
  const allDeviceTypes = model.parseAllDeviceTypes(
    deviceTypeUrl,
    allDeviceModels,
  );
  const allBrands = model.parseAllBrands(brandUrl, allDeviceModels);

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
