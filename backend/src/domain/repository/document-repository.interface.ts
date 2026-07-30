import type { IDocument } from "../entities/Document";

export interface IDocumentRepository {
  findById(id: string): Promise<IDocument | null>;
  findAll(
    filter?: Partial<
      Pick<IDocument, "buildingId" | "tenantId" | "unitId" | "leaseId" | "type">
    >,
  ): Promise<IDocument[]>;
  create(
    data: Omit<IDocument, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IDocument>;
  delete(id: string): Promise<boolean>;
  existsById(id: string): Promise<boolean>;
}
