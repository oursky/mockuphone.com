import * as schema from "./parse/index";

export interface Orientation {
  alt?: string;
  name?: string;
}

export interface Device {
  credits: string;
  desc: string; // desc is usually [color], if [color] not available, will fallback to [model_no]
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
  color: DeviceColor;
}

export type DeviceType = Partial<Record<schema.DeviceTypeEnum, Device[]>>;
export type Brand = Partial<Record<schema.BrandEnum, Device[]>>;
export type Model = Partial<Record<schema.ModelEnum, Device[]>>;

export interface DeviceColor {
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
  allDevices: Device[],
): DeviceType {
  let result: DeviceType = {};
  Object.keys(data).forEach((type: string) => {
    const deviceType = schema.DeviceTypeEnum.parse(type);

    const devices: Device[] = allDevices.filter(
      (d) => data[deviceType]?.includes(d.device_id),
    );

    result[deviceType] = devices;
  });
  return result;
}

export function parseAllDeviceTypes(
  url: string,
  allDevices: Device[],
): DeviceType {
  const rawDeviceTypes: schema.RawDeviceType =
    schema.parseRawDeviceTypeFile(url);
  return mapDeviceType(rawDeviceTypes, allDevices);
}

function mapBrand(data: schema.RawBrand, allDevices: Device[]): Brand {
  let result: Brand = {};
  Object.keys(data).forEach((brandKey: string) => {
    const brand = schema.BrandEnum.parse(brandKey);

    const devices: Device[] = allDevices.filter(
      (d) => data[brand]?.includes(d.device_id),
    );

    result[brand] = devices;
  });
  return result;
}

export function parseAllBrands(url: string, allDevices: Device[]): Brand {
  const rawBrand: schema.RawBrand = schema.parseRawBrandFile(url);
  return mapBrand(rawBrand, allDevices);
}

function mapModel(data: schema.RawModel, allDevices: Device[]): Model {
  let result: Model = {};
  Object.keys(data).forEach((modelKey: string) => {
    const model = schema.ModelEnum.parse(modelKey);

    const devices: Device[] = allDevices.filter(
      (d) => data[model]?.slugs.includes(d.device_id),
    );

    result[model] = devices;
  });
  return result;
}

export function parseAllModels(url: string, allDevices: Device[]): Model {
  const rawModel: schema.RawModel = schema.parseRawModelFile(url);
  return mapModel(rawModel, allDevices);
}
