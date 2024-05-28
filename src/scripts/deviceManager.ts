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

  public getModel(modelId: ModelEnum): model.ModelValue | undefined {
    return this.allDeviceModels[modelId];
  }

  public getModelColorDevice(
    modelId: ModelEnum,
    colorId: string | "default",
  ): model.Device | undefined {
    const devices = this.getDeviceListByModel(modelId);
    const result = devices.filter((d) => {
      const matchDefault = d.color == null && colorId === "default";
      const matchColorId = d.color != null && d.color.id === colorId;

      return matchDefault || matchColorId;
    });
    if (result.length === 0) {
      return undefined;
    }
    return result[0];
  }

  public getModelIdByDevice(deviceId: string): ModelEnum | undefined {
    for (let modelId of Object.keys(this.allDeviceModels)) {
      const _modelId = ModelEnum.parse(modelId);
      const modelDevices = this.allDeviceModels[_modelId]?.devices ?? [];
      for (let device of modelDevices) {
        if (device.device_id === deviceId) {
          return _modelId;
        }
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
  ): model.BrandValue | undefined {
    const targetBrand = this.allBrands[brand];
    return targetBrand;
  }

  public getModelThumbnailList(
    deviceType?: DeviceTypeEnum | "all",
    brand?: BrandEnum,
  ): model.ModelThumbnail[] {
    if (brand == null || deviceType == null) {
      return [];
    }

    const targetBrand: model.BrandValue | undefined = this.allBrands[brand];
    const targetType: model.ModelThumbnail[] =
      deviceType === "all"
        ? this.allModelThumbnails
        : this.allDeviceTypes[deviceType] ?? [];
    return targetType.filter(
      (value) =>
        targetBrand?.thumbnails
          .map((value) => value.modelId)
          .includes(value.modelId),
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

  public getBrandValues(): Partial<Record<BrandEnum, model.BrandValue>> {
    let result: Partial<Record<BrandEnum, model.BrandValue>> = {};
    BrandEnum.options.forEach((b: BrandEnum) => {
      const brandValue = this.allBrands[b];
      if (brandValue == null) {
        return;
      }
      result[b] = brandValue;
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
