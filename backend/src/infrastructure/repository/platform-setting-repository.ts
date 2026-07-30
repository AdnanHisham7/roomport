import { IPlatformSetting } from "../../domain/entities/PlatformSetting";
import { IPlatformSettingRepository } from "../../domain/repository/platform-setting-repository.interface";
import { PlatformSettingModel } from "../db/model/platform-setting-model";

export class PlatformSettingRepository implements IPlatformSettingRepository {
  private toEntity(doc: any): IPlatformSetting {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: obj._id?.toString(),
      updatedBy: obj.updatedBy?.toString() ?? undefined,
    };
  }

  async get(): Promise<IPlatformSetting> {
    let doc = await PlatformSettingModel.findOne().lean();
    if (!doc) {
      doc = (await PlatformSettingModel.create({})).toObject();
    }
    return this.toEntity(doc);
  }

  async update(
    data: Partial<IPlatformSetting>,
    updatedBy?: string,
  ): Promise<IPlatformSetting> {
    const existing = await PlatformSettingModel.findOne();
    if (!existing) {
      const created = await PlatformSettingModel.create({ ...data, updatedBy });
      return this.toEntity(created);
    }
    existing.set({ ...data, updatedBy });
    await existing.save();
    return this.toEntity(existing);
  }
}
