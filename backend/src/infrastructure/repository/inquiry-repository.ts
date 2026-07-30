import { IInquiry } from "../../domain/entities/Inquiry";
import {
  IInquiryRepository,
  InquiryListFilter,
} from "../../domain/repository/inquiry-repository.interface";
import { InquiryModel } from "../db/model/inquiry-model";

export class InquiryRepository implements IInquiryRepository {
  private toEntity(doc: any): IInquiry {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: obj._id?.toString(),
      buildingId: obj.buildingId?.toString(),
      unitId: obj.unitId?.toString() ?? undefined,
      ownerId: obj.ownerId?.toString(),
    };
  }

  private buildQuery(filter?: InquiryListFilter): Record<string, any> {
    const query: Record<string, any> = {};
    if (!filter) return query;
    if (filter.ownerId) query.ownerId = filter.ownerId;
    if (filter.buildingId) query.buildingId = filter.buildingId;
    if (filter.status) query.status = filter.status;
    return query;
  }

  async findById(id: string): Promise<IInquiry | null> {
    const doc = await InquiryModel.findById(id).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findAllPaginated(
    filter: InquiryListFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: IInquiry[]; total: number }> {
    const query = this.buildQuery(filter);
    const [docs, total] = await Promise.all([
      InquiryModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InquiryModel.countDocuments(query),
    ]);
    return { data: docs.map((d) => this.toEntity(d)), total };
  }

  async countAll(filter?: InquiryListFilter): Promise<number> {
    return InquiryModel.countDocuments(this.buildQuery(filter));
  }

  async create(
    data: Omit<IInquiry, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IInquiry> {
    const doc = await InquiryModel.create(data);
    return this.toEntity(doc);
  }

  async update(id: string, data: Partial<IInquiry>): Promise<IInquiry | null> {
    const doc = await InquiryModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async delete(id: string): Promise<boolean> {
    const result = await InquiryModel.findByIdAndDelete(id);
    return !!result;
  }
}
