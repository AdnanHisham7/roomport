import type { IBuilding } from "../../domain/entities/Building";
import type {
  IBuildingRepository,
  BuildingListFilter,
} from "../../domain/repository/building-repository.interface";
import { BuildingModel } from "../db/model/building-model";
import mongoose from "mongoose";

export class BuildingRepository implements IBuildingRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(doc: any): IBuilding {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      ownerId: obj.ownerId?.toString() ?? "",
      managerId: obj.managerId?.toString() ?? undefined,
      documents: (obj.documents ?? []).map((d: any) => d?.toString()),
    };
  }

  private buildQuery(filter?: BuildingListFilter): Record<string, any> {
    const query: Record<string, any> = {};
    if (!filter) return query;
    if (filter.ownerId) query.ownerId = filter.ownerId;
    if (filter.managerId) query.managerId = filter.managerId;
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    if (filter.isPublished !== undefined)
      query.isPublished = filter.isPublished;
    if (filter.isFeatured !== undefined) query.isFeatured = filter.isFeatured;
    if (filter.city)
      query["location.city"] = new RegExp(filter.city.trim(), "i");
    if (filter.state)
      query["location.state"] = new RegExp(filter.state.trim(), "i");
    if (filter.search) {
      const re = new RegExp(filter.search.trim(), "i");
      query.$or = [
        { name: re },
        { "location.city": re },
        { "location.address": re },
      ];
    }
    return query;
  }

  async findById(id: string): Promise<IBuilding | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await BuildingModel.findById(id).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findByIdOrSlug(idOrSlug: string): Promise<IBuilding | null> {
    const isObjectId = mongoose.isValidObjectId(idOrSlug);
    const query = isObjectId
      ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
      : { slug: idOrSlug };
    const doc = await BuildingModel.findOne(query).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findBySlug(slug: string): Promise<IBuilding | null> {
    const doc = await BuildingModel.findOne({ slug }).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const query: any = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    return !!(await BuildingModel.exists(query));
  }

  async findAll(filter?: BuildingListFilter): Promise<IBuilding[]> {
    const docs = await BuildingModel.find(this.buildQuery(filter))
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findAllPaginated(
    filter: BuildingListFilter,
    skip: number,
    limit: number,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
  ): Promise<{ data: IBuilding[]; total: number }> {
    const query = this.buildQuery(filter);
    const [docs, total] = await Promise.all([
      BuildingModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
      BuildingModel.countDocuments(query),
    ]);
    return { data: docs.map((d) => this.toEntity(d)), total };
  }

  async findByOwnerId(ownerId: string): Promise<IBuilding[]> {
    const docs = await BuildingModel.find({ ownerId }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findWithinBounds(bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }): Promise<IBuilding[]> {
    const docs = await BuildingModel.find({
      isPublished: true,
      status: "active",
      "location.latitude": {
        $gte: bounds.minLat,
        $lte: bounds.maxLat,
        $ne: null,
      },
      "location.longitude": {
        $gte: bounds.minLng,
        $lte: bounds.maxLng,
        $ne: null,
      },
    }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async countAll(filter?: BuildingListFilter): Promise<number> {
    return BuildingModel.countDocuments(this.buildQuery(filter));
  }

  async create(
    data: Omit<IBuilding, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IBuilding> {
    const doc = await BuildingModel.create(data);
    return this.toEntity(doc);
  }

  async update(
    id: string,
    data: Partial<IBuilding>,
  ): Promise<IBuilding | null> {
    const doc = await BuildingModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async incrementFields(
    id: string,
    fields: Partial<Record<"totalFloors" | "totalUnits" | "viewCount", number>>,
  ): Promise<void> {
    await BuildingModel.updateOne({ _id: id }, { $inc: fields });
  }

  async delete(id: string): Promise<boolean> {
    const result = await BuildingModel.findByIdAndDelete(id);
    return !!result;
  }

  async existsById(id: string): Promise<boolean> {
    return !!(await BuildingModel.exists({ _id: id }));
  }

  async distinctCities(): Promise<string[]> {
    const cities = await BuildingModel.distinct("location.city", {
      isPublished: true,
    });
    return (cities as string[]).filter(Boolean).sort();
  }
}
