import { DeviceManager } from "../deviceManager";
import { BrandValue, ModelValue } from "../model";
import { BrandEnum, ModelEnum } from "../parse";

export interface SearchBarModelItem {
  id: ModelEnum;
  name: string;
  pathname: string;
}

export interface SearchBarBrandItem {
  id: BrandEnum;
  name: string;
  pathname: string;
}

export const getModelItems = (
  deviceManager: DeviceManager,
): SearchBarModelItem[] =>
  Object.keys(deviceManager.allDeviceModels)
    .map((modelKey) => {
      const _modelKey: ModelEnum = ModelEnum.parse(modelKey);
      return deviceManager.allDeviceModels[_modelKey];
    })
    .filter((v: ModelValue | undefined) => {
      return v != null;
    })
    // @ts-expect-error // tsc cannot parse non-undefined
    .map((v: ModelValue) => {
      return {
        id: v.id,
        name: v.name,
        pathname: `/model/${v.id}`,
      };
    });

export const getBrandItems = (
  deviceManager: DeviceManager,
): SearchBarBrandItem[] =>
  Object.keys(deviceManager.allBrands)
    .map((brandKey) => {
      const _brandKey: BrandEnum = BrandEnum.parse(brandKey);
      return deviceManager.allBrands[_brandKey];
    })
    .filter((v: BrandValue | undefined) => {
      return v != null;
    })
    // @ts-expect-error // tsc cannot parse non-undefined
    .map((v: BrandValue) => {
      return {
        id: v.id,
        name: v.name,
        // Added trailing slash because astro can only read this
        pathname: `/type/all/?brand=${v.id}`,
      };
    });
