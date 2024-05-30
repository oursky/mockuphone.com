import { DeviceManager } from "../deviceManager";
import { ModelValue } from "../model";
import { ModelEnum } from "../parse";

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
        pathname: `/model/${v.id}/color/${v.devices[0].color?.id ?? "default"}`,
      };
    });
