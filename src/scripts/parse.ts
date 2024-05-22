import * as fs from "fs";
import { z } from "zod";

const RawDeviceSeries = z.object({
  id: z.string(),
  name: z.string(),
  slugs: z.string().array(),
});

export type RawDeviceSeries = z.infer<typeof RawDeviceSeries>;

const RawDevice = z.object({
  credits: z.string(),
  desc: z.string(),
  meta_title: z.string(),
  meta_description: z.string(),
  display_resolution: z.number().array(),
  device_type: z.string(),
  device_id: z.string(),
  name: z.string(),
  short_name: z.optional(z.string()),
  orientations: z
    .object({
      alt: z.string(),
      name: z.string(),
      legacy_file: z.optional(z.string()),
      coords: z.number().array().array(),
    })
    .array(),
  view_desc: z.string(),
  is_mockup_image_at_front: z.optional(z.boolean()),
  is_legacy: z.optional(z.boolean()).default(false),
});

export type RawDevice = z.infer<typeof RawDevice>;

export interface RawDeviceCatalog {
  ios: RawDeviceSeries[];
  android: RawDeviceSeries[];
  wearables: RawDeviceSeries[];
  computer: RawDeviceSeries[];
  tv: RawDeviceSeries[];
}

export interface RawJson {
  DeviceArray: RawDevice[];
  DeviceCatalog: RawDeviceCatalog;
}

export function parseJson(url: string): RawJson {
  const jsonString = fs.readFileSync(url, "utf-8");
  const jsonData = JSON.parse(jsonString);
  return {
    DeviceArray: parseRawDevice(jsonData.devices),
    DeviceCatalog: parseDeviceCatalog(jsonData.device_cat),
  };
}

function parseDeviceCatalog(data: any): RawDeviceCatalog {
  const rawDeviceCatalog = {} as RawDeviceCatalog;
  for (const key in data) {
    rawDeviceCatalog[key as keyof RawDeviceCatalog] = parseRawDeviceSeries(
      data[key as keyof RawDeviceCatalog],
    );
  }
  return rawDeviceCatalog;
}

function parseRawDeviceSeries(data: any): RawDeviceSeries[] {
  return data.map((device: any) => RawDeviceSeries.parse(device));
}

function parseRawDevice(data: any): RawDevice[] {
  return data.map((device: any) => RawDevice.parse(device));
}
