import * as fs from "fs";
import { z } from "zod";
import { Json } from "./common";

export const DeviceTypeEnum = z.enum([
  "phone",
  "tablet",
  "laptop",
  "wearables",
  "tv",
]);

export type DeviceTypeEnum = z.infer<typeof DeviceTypeEnum>;
const RawDeviceType = z.record(DeviceTypeEnum, z.array(z.string()));
export type RawDeviceType = z.infer<typeof RawDeviceType>;

export function parseRawDeviceTypeFile(url: string): RawDeviceType {
  const jsonString = fs.readFileSync(url, "utf-8");
  const jsonData = JSON.parse(jsonString);
  return parseRawDeviceType(jsonData);
}

function parseRawDeviceType(data: Json): RawDeviceType {
  const parsed = RawDeviceType.safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error);
    throw parsed.error;
  }
  return parsed.data;
}
