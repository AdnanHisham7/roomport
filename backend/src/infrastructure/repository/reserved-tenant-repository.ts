import { IReservedTenant } from "../../domain/entities/ReservedTenant";
import { IReservedTenantRepository } from "../../domain/repository/reserved-tenant-repository.interface";
import { ReservedTenantModel } from "../db/model/reserved-tenant-model";

export class ReservedTenantRepository implements IReservedTenantRepository {
  private toEntity(doc: any): IReservedTenant {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: obj._id.toString(),
      buildingId: obj.buildingId?.toString() ?? "",
      unitId: obj.unitId?.toString() ?? "",
      bookingId: obj.bookingId?.toString() ?? "",
      ownerId: obj.ownerId?.toString() ?? "",
    };
  }

  async upsertForUnit(
    unitId: string,
    data: Omit<IReservedTenant, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IReservedTenant> {
    const doc = await ReservedTenantModel.findOneAndUpdate(
      { unitId },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return this.toEntity(doc);
  }

  async findByUnitId(unitId: string): Promise<IReservedTenant | null> {
    const doc = await ReservedTenantModel.findOne({ unitId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async deleteByUnitId(unitId: string): Promise<void> {
    await ReservedTenantModel.deleteOne({ unitId });
  }
}
