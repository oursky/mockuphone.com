import * as schema from "./parse";
import * as fs from "fs";

export interface Orientation {
  alt?: string;
  name?: string;
}

export interface Device {
  credits: string;
  desc: string;
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
}

export interface DeviceSeries {
  id: string;
  name: string;
  device: Device[];
}

export enum DeviceType {
  ios = "ios",
  android = "android",
  wearables = "wearables",
  tv = "tv",
  computer = "computer",
}

export interface DeviceCatalogItem {
  deviceCatalog: string;
  deviceSeries: DeviceSeries[];
}

export interface DeviceCatalog {
  deviceCatalogArray: DeviceCatalogItem[];
}

export function parseDeviceCatalog(url: string): DeviceCatalog {
  const json_data = schema.parseJson(url) as schema.RawJson;
  const allDevicesInfo = parseAllDevice(json_data.DeviceArray) as Device[];
  return {
    deviceCatalogArray: Object.keys(DeviceType).map((type) =>
      parseDeviceCatalogItem(
        json_data.DeviceCatalog[type as keyof schema.RawDeviceCatalog],
        type,
        allDevicesInfo,
      ),
    ),
  };
}

function parseDeviceCatalogItem(
  data: schema.RawDeviceSeries[],
  type: string,
  allDeviceInfo: Device[],
): DeviceCatalogItem {
  const deviceSeries: DeviceSeries[] = data.map(
    (series: schema.RawDeviceSeries) =>
      parseDeviceSeries(series, allDeviceInfo),
  );
  return {
    deviceCatalog: type, // need to fix
    deviceSeries: deviceSeries,
  };
}

function parseDeviceSeries(
  data: schema.RawDeviceSeries,
  allDeviceInfo: Device[],
): DeviceSeries {
  const deviceArray: Device[] = data.slugs.map((slug) => {
    return allDeviceInfo.filter((device: Device) => {
      if (device.device_id === slug) return device;
    })[0];
  });
  return {
    id: data.id,
    name: data.name,
    device: deviceArray,
  };
}

function parseDevice(data: schema.RawDevice): Device {
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

function parseAllDevice(data: schema.RawDevice[]): Device[] {
  return data.map((device: schema.RawDevice) => parseDevice(device));
}
