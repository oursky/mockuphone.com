import * as fs from "fs";
import { z } from "zod";
import { DeviceTypeEnum, Json } from "./common";
import { ModelEnum } from "./parseModel";

const RawDeviceType = z.record(DeviceTypeEnum, z.array(ModelEnum));
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
