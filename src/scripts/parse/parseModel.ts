import * as fs from "fs";
import { SafeParseReturnType, SafeParseSuccess, z } from "zod";
import { Json } from "./common";

export const ModelEnum = z.enum([
  // https://en.wikipedia.org/wiki/List_of_Apple_products
  "iphone-14",
  "iphone-14-plus",
  "iphone-14-pro",
  "iphone-14-pro-max",
  "iphone-13",
  "iphone-13-mini",
  "iphone-13-pro",
  "iphone-13-pro-max",
  "ipad-pro-11-inch",
  "ipad-pro-13-inch",
  "ipad-air-5",
  "ipad", // FIXME: figure out which gen
  "ipad-mini", // FIXME: figure out which gen

  // https://en.wikipedia.org/wiki/Google_Pixel
  "google-pixel-1",
  "google-pixel-4",
  "google-pixel-4-xl",
  "google-pixel-5",

  // https://en.wikipedia.org/wiki/Motorola_Moto
  "moto-e",
  "moto-g", // FIXME: figure out which gen

  // https://en.wikipedia.org/wiki/Samsung_Galaxy
  // https://en.wikipedia.org/wiki/Samsung_Galaxy_S_series
  "galaxy-s21-plus",
  "galaxy-s21-ultra",
  "galaxy-s21",
  "galaxy-s20-plus",
  "galaxy-s20",
  "galaxy-s20-ultra",
  "galaxy-s-duos", // https://en.wikipedia.org/wiki/Samsung_Galaxy_S_Duos
  "galaxy-s4",

  // https://en.wikipedia.org/wiki/Samsung_Galaxy_Note_series
  "galaxy-note-5",

  // https://en.wikipedia.org/wiki/Samsung_Galaxy_Y
  "galaxy-y",

  "oneplus-8-pro",

  "apple-watch-ultra",
  "apple-watch-series-8-41mm",
  "apple-watch-series-8-45mm",

  // https://en.wikipedia.org/wiki/MacBook_Pro#Timeline
  "macbook-12-inch",
  "macbook-pro-14-inch",
  "macbook-pro-16-inch",
  "macbook-air-13-inch",

  "imac-2013", // FIXME: is this 2014 instead?
  "imac-2015",
  "imac-2015-retina",

  "dell-xps-13",
  "dell-xps-15",

  // https://en.wikipedia.org/wiki/Microsoft_Surface
  "microsoft-surface-book",
  "microsoft-surface-pro-4",
  "microsoft-surface-pro-3",

  "samsung-tv-es8000",
  "samsung-tv-d8000",

  "lg-55lw5600",
  "lg-tm2792",
]);

export type ModelEnum = z.infer<typeof ModelEnum>;

const ModelValues = z.object({
  name: z.string(),
  slugs: z.array(z.string()),
});
const RawModel = z.record(ModelEnum, ModelValues);

export type RawModel = z.infer<typeof RawModel>;

export function parseRawModelFile(url: string): RawModel {
  const jsonString = fs.readFileSync(url, "utf-8");
  const jsonData = JSON.parse(jsonString);

  return parseRawModel(jsonData);
}

function parseRawModel(data: Json): RawModel {
  const parsed = RawModel.safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error);
    throw parsed.error;
  }
  return parsed.data;
}
