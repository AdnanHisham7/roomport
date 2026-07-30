import { AgreementStatus, IAgreement } from "../../domain/entities/Agreement";
import { IAgreementRepository } from "../../domain/repository/agreement-repository.interface";
import { AgreementModel } from "../db/model/agreement-model";

export class AgreementRepository implements IAgreementRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(doc: any): IAgreement {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      tenantId: obj.tenantId?.toString() ?? "",
      buildingId: obj.buildingId?.toString() ?? "",
      unitId: obj.unitId?.toString() ?? undefined,
      createdBy: obj.createdBy?.toString() ?? "",
      documentId: obj.documentId?.toString() ?? undefined,
    };
  }

  async create(
    data: Omit<IAgreement, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IAgreement> {
    const doc = await AgreementModel.create(data);
    return this.toEntity(doc);
  }

  async findById(id: string): Promise<IAgreement | null> {
    const doc = await AgreementModel.findById(id).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  // ── Must use +signingTokenHash because it is select:false ─────────────────
  async findByTokenHash(tokenHash: string): Promise<IAgreement | null> {
    const doc = await AgreementModel.findOne({ signingTokenHash: tokenHash })
      .select("+signingTokenHash +otpHash")
      .lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findAll(filter?: {
    tenantId?: string;
    propertyId?: string;
    status?: AgreementStatus;
  }): Promise<IAgreement[]> {
    const query: Record<string, any> = {};
    if (filter?.tenantId) query.tenantId = filter.tenantId;
    if ((filter as any)?.buildingId)
      query.buildingId = (filter as any).buildingId;
    if (filter?.status) query.status = filter.status;

    const docs = await AgreementModel.find(query).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async update(
    id: string,
    data: Partial<IAgreement>,
  ): Promise<IAgreement | null> {
    const doc = await AgreementModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    )
      .select("+signingTokenHash +otpHash")
      .lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async existsById(id: string): Promise<boolean> {
    return !!(await AgreementModel.exists({ _id: id }));
  }
}
