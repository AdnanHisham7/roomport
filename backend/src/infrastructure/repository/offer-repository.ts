import { IOffer } from "../../domain/entities/Offer";
import {
  IOfferRepository,
  OfferListFilter,
} from "../../domain/repository/offer-repository.interface";
import { OfferModel } from "../db/model/offer-model";

export class OfferRepository implements IOfferRepository {
  private toEntity(doc: any): IOffer {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: obj._id.toString(),
      buildingId: obj.buildingId?.toString() ?? "",
      unitId: obj.unitId?.toString() ?? "",
      ownerId: obj.ownerId?.toString() ?? "",
      createdBy: obj.createdBy?.toString() ?? "",
    };
  }

  private buildQuery(filter?: OfferListFilter): Record<string, any> {
    const q: Record<string, any> = {};
    if (filter?.buildingId) q.buildingId = filter.buildingId;
    if (filter?.unitId) q.unitId = filter.unitId;
    if (filter?.ownerId) q.ownerId = filter.ownerId;
    if (filter?.isActive !== undefined) q.isActive = filter.isActive;
    return q;
  }

  async create(
    data: Omit<IOffer, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IOffer> {
    const doc = await OfferModel.create(data);
    return this.toEntity(doc);
  }

  async findById(id: string): Promise<IOffer | null> {
    const doc = await OfferModel.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(filter?: OfferListFilter): Promise<IOffer[]> {
    const docs = await OfferModel.find(this.buildQuery(filter))
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findAllPaginated(
    filter: OfferListFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: IOffer[]; total: number }> {
    const q = this.buildQuery(filter);
    const [docs, total] = await Promise.all([
      OfferModel.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      OfferModel.countDocuments(q),
    ]);
    return { data: docs.map((d) => this.toEntity(d)), total };
  }

  async findActiveByUnitIds(unitIds: string[], now: Date): Promise<IOffer[]> {
    if (!unitIds.length) return [];
    const docs = await OfferModel.find({
      unitId: { $in: unitIds },
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async deactivateActiveForUnit(
    unitId: string,
    excludeId?: string,
  ): Promise<void> {
    const query: Record<string, any> = { unitId, isActive: true };
    if (excludeId) query._id = { $ne: excludeId };
    await OfferModel.updateMany(query, { $set: { isActive: false } });
  }

  async update(id: string, data: Partial<IOffer>): Promise<IOffer | null> {
    const doc = await OfferModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await OfferModel.findByIdAndDelete(id);
    return !!res;
  }
}
