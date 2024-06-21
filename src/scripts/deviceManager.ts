import * as model from "./model";
import { BrandEnum, DeviceTypeEnum, ModelEnum } from "./parse";

const MODEL_TYPE_SORT_ORDER: Record<DeviceTypeEnum, number> = {
  phone: 1,
  tablet: 2,
  laptop: 3,
  wearables: 4,
  tv: 5,
};
function sortModel(a: model.ModelThumbnail, b: model.ModelThumbnail): number {
  const typeSort =
    MODEL_TYPE_SORT_ORDER[a.modelType] - MODEL_TYPE_SORT_ORDER[b.modelType];
  const dateSort = sortByDate(a.modelLaunchDate, b.modelLaunchDate, "desc");
  const nameSort = a.modelName.localeCompare(b.modelName);
  return typeSort || dateSort || nameSort;
}
function sortByDate(a: Date, b: Date, order: "asc" | "desc" = "asc"): number {
  const epochA = a.getTime();
  const epochB = b.getTime();
  return order === "asc" ? epochA - epochB : epochB - epochA;
}

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

  public getModel(modelId: ModelEnum): model.ModelValue | undefined {
    return this.allDeviceModels[modelId];
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
    const typeBrandIntersection = targetType.filter(
      (value) =>
        targetBrand?.thumbnails
          .map((value) => value.modelId)
          .includes(value.modelId),
    ); // ref https://stackoverflow.com/a/1885569/19287186

    return typeBrandIntersection.sort(sortModel);
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
