import type { IDocument } from "../../domain/entities/Document";
import type { IDocumentRepository } from "../../domain/repository/document-repository.interface";
import { DocumentModel } from "../db/model/document-model";

export class DocumentRepository implements IDocumentRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(doc: any): IDocument {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      unitId: obj.unitId?.toString() ?? undefined,
      buildingId: obj.buildingId?.toString() ?? undefined,
      tenantId: obj.tenantId?.toString() ?? undefined,
      leaseId: obj.leaseId?.toString() ?? undefined,
      uploadedBy: obj.uploadedBy?.toString() ?? "",
    };
  }

  async findById(id: string): Promise<IDocument | null> {
    const doc = await DocumentModel.findById(id).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findAll(
    filter?: Partial<
      Pick<IDocument, "buildingId" | "tenantId" | "unitId" | "leaseId" | "type">
    >,
  ): Promise<IDocument[]> {
    const query: Record<string, any> = {};
    if (filter?.buildingId) query.buildingId = filter.buildingId;
    if (filter?.tenantId) query.tenantId = filter.tenantId;
    if (filter?.unitId) query.unitId = filter.unitId;
    if (filter?.leaseId) query.leaseId = filter.leaseId;
    if (filter?.type) query.type = filter.type;

    const docs = await DocumentModel.find(query).lean();
    return docs.map((d) => this.toEntity(d));
  }

  async create(
    data: Omit<IDocument, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IDocument> {
    const doc = await DocumentModel.create(data);
    return this.toEntity(doc);
  }

  async delete(id: string): Promise<boolean> {
    const result = await DocumentModel.findByIdAndDelete(id);
    return !!result;
  }

  async existsById(id: string): Promise<boolean> {
    return !!(await DocumentModel.exists({ _id: id }));
  }
}
