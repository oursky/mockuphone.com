import { DeviceManager } from "../deviceManager";
import { BrandValue, ModelValue } from "../model";
import { BrandEnum, ModelEnum } from "../parse";

export const getModelItems = (deviceManager: DeviceManager) =>
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

export const getBrandItems = (deviceManager: DeviceManager) =>
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
        pathname: `/type/all?brand=${v.id}`,
      };
    });
