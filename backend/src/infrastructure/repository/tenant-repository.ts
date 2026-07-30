import { ITenant } from "../../domain/entities/Tenant";
import { ITenantRepository } from "../../domain/repository/tenant-repository.interface";
import { TenantModel } from "../db/model/tenant-model";

export class TenantRepository implements ITenantRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(doc: any): ITenant {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      unitId: obj.unitId?.toString() ?? undefined,
      buildingId: obj.buildingId?.toString() ?? undefined,
      userId: obj.userId?.toString() ?? undefined,
      createdBy: obj.createdBy?.toString() ?? undefined,
      addressId: obj.addressId?.toString() ?? undefined,
      renewedFromTenantId: obj.renewedFromTenantId?.toString() ?? undefined,
      document: (obj.document ?? []).map((d: any) => d?.toString()),
    };
  }

  async findById(id: string): Promise<ITenant | null> {
    const doc = await TenantModel.findById(id).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findAll(
    filter?: Partial<Pick<ITenant, "buildingId" | "unitId" | "status">> & {
      createdBy?: string;
    },
  ): Promise<ITenant[]> {
    const query: Record<string, any> = {};
    if (filter?.buildingId) query.buildingId = filter.buildingId;
    if (filter?.unitId) query.unitId = filter.unitId;
    if (filter?.status) query.status = filter.status;
    if (filter?.createdBy) query.createdBy = filter.createdBy;

    const docs = await TenantModel.find(query).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findByBuildingId(buildingId: string): Promise<ITenant[]> {
    const docs = await TenantModel.find({ buildingId }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findByEmail(email: string): Promise<ITenant[]> {
    const docs = await TenantModel.find({
      email: email.trim().toLowerCase(),
    }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async create(
    data: Omit<ITenant, "_id" | "createdAt" | "updatedAt">,
  ): Promise<ITenant> {
    const doc = await TenantModel.create(data);
    return this.toEntity(doc);
  }

  async update(id: string, data: Partial<ITenant>): Promise<ITenant | null> {
    const doc = await TenantModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async delete(id: string): Promise<boolean> {
    const result = await TenantModel.findByIdAndDelete(id);
    return !!result;
  }

  async existsById(id: string): Promise<boolean> {
    return !!(await TenantModel.exists({ _id: id }));
  }
}
