import * as schema from "./parse/index";

export interface Orientation {
  alt?: string;
  name?: string;
}

export interface Device {
  credits: string;
  desc: string; // desc is usually [color], if [color] not available, will fallback to [model_no]
  color_str: string;
  meta_title: string;
  meta_description: string;
  display_resolution: number[];
  device_id: string;
  device_type: string;
  name: string;
  short_name?: string;
  orientations: Orientation[];
  view_desc: string;
  imagePath?: [string, string][];
  color: DeviceColor | null;
}

export interface ModelThumbnail {
  modelId: schema.ModelEnum;
  modelName: string;
  modelLaunchDate: Date;
  modelType: schema.DeviceTypeEnum;
  device: Device;
}

export interface BrandValue {
  id: schema.BrandEnum;
  name: string;
  thumbnails: ModelThumbnail[];
}

export interface ModelValue {
  id: schema.ModelEnum;
  name: string;
  launchDate: Date;
  type: schema.DeviceTypeEnum;
  devices: Device[];
}

export type DeviceType = Partial<
  Record<schema.DeviceTypeEnum, ModelThumbnail[]>
>;
export type Brand = Partial<Record<schema.BrandEnum, BrandValue>>;
export type Model = Partial<Record<schema.ModelEnum, ModelValue>>;

export function getModelValue(
  modelId: schema.ModelEnum,
  allModels: Model,
): ModelValue | undefined {
  if (allModels[modelId] == null) {
    return undefined;
  }
  return allModels[modelId];
}

export function mapModelThumbnails(
  targetModels: schema.ModelEnum[],
  allModels: Model,
): ModelThumbnail[] {
  let result: ModelThumbnail[] = [];

  targetModels.forEach((m) => {
    const modelValue = getModelValue(m, allModels);

    if (modelValue == null || modelValue.devices.length === 0) {
      return;
    }
    result.push({
      modelId: modelValue.id,
      modelName: modelValue.name,
      modelLaunchDate: new Date(modelValue.launchDate),
      modelType: modelValue.type,
      device: modelValue.devices[0],
    });
  });
  return result;
}

export interface DeviceColor {
  id: string;
  name: string;
  hexcode: string; // #000000,
}

function mapDevice(data: schema.RawDevice): Device {
  const imagePath: [string, string][] = data.orientations.map(
    (orientationItem: any) => [
      (data.is_legacy
        ? "/Images/devices_picture/"
        : "/Images/mockup_templates/") +
        data.device_id +
        "-" +
        orientationItem.name +
        ".png",
      orientationItem.alt,
    ],
  );
  const deviceItem: Device = {
    ...data,
    imagePath: imagePath,
  };
  return deviceItem;
}

export function parseAllDevices(url: string): Device[] {
  const rawDevices: schema.RawDevice[] = schema.parseRawDevicesFile(url);
  return rawDevices.map(mapDevice);
}

function mapDeviceType(
  data: schema.RawDeviceType,
  allModels: Model,
): DeviceType {
  let result: DeviceType = {};
  Object.keys(data).forEach((type: string) => {
    const deviceType = schema.DeviceTypeEnum.parse(type);

    const models: schema.ModelEnum[] = data[deviceType] ?? [];

    const modelThumbnails = mapModelThumbnails(models, allModels);
    result[deviceType] = modelThumbnails;
  });
  return result;
}

export function parseAllDeviceTypes(url: string, allModels: Model): DeviceType {
  const rawDeviceTypes: schema.RawDeviceType =
    schema.parseRawDeviceTypeFile(url);
  return mapDeviceType(rawDeviceTypes, allModels);
}

function mapBrandValue(bv: schema.RawBrandValue, allModels: Model): BrandValue {
  return {
    ...bv,
    thumbnails: mapModelThumbnails(bv.modelIds, allModels),
  };
}
function mapBrand(data: schema.RawBrand, allModels: Model): Brand {
  let result: Brand = {};
  Object.keys(data).forEach((brandKey: string) => {
    const brand = schema.BrandEnum.parse(brandKey);

    const rawBrandValue: schema.RawBrandValue | undefined = data[brand];

    if (rawBrandValue == null) {
      return;
    }
    const brandValue: BrandValue = mapBrandValue(rawBrandValue, allModels);

    result[brand] = brandValue;
  });
  return result;
}

export function parseAllBrands(url: string, allModels: Model): Brand {
  const rawBrand: schema.RawBrand = schema.parseRawBrandFile(url);
  return mapBrand(rawBrand, allModels);
}

function mapModel(data: schema.RawModel, allDevices: Device[]): Model {
  let result: Model = {};
  Object.keys(data).forEach((modelKey: string) => {
    const model = schema.ModelEnum.parse(modelKey);

    const target = data[model];
    if (target == null) {
      throw new Error("Error in mapping Model");
    }

    const devices: Device[] = allDevices.filter((d) =>
      target.slugs.includes(d.device_id),
    );

    result[model] = {
      id: model,
      name: target.name,
      launchDate: new Date(target.launchDateTimestamp),
      type: target.type,
      devices,
    };
  });
  return result;
}

export function parseAllModels(url: string, allDevices: Device[]): Model {
  const rawModel: schema.RawModel = schema.parseRawModelFile(url);
  return mapModel(rawModel, allDevices);
}
