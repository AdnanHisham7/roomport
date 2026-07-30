import { IPlatformSetting } from "../entities/PlatformSetting";

export interface IPlatformSettingRepository {
  get(): Promise<IPlatformSetting>; // returns singleton, creating defaults if absent
  update(
    data: Partial<IPlatformSetting>,
    updatedBy?: string,
  ): Promise<IPlatformSetting>;
}
