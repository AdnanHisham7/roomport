import type { DocumentType } from "../../../domain/entities/Document";

export interface CreateDocumentDTO {
  unitId?: string;
  buildingId?: string;
  tenantId?: string;
  leaseId?: string;
  type: DocumentType;
  title: string;
  description?: string;
  fileUrl: string;
  fileSize?: number;
  expiryDate?: Date;
  uploadedBy: string;
}

export interface DocumentResponseDTO {
  _id: string;
  unitId?: string;
  buildingId?: string;
  tenantId?: string;
  leaseId?: string;
  type: DocumentType;
  title: string;
  description?: string;
  fileUrl: string;
  fileSize?: number;
  expiryDate?: Date;
  uploadedBy: string;
  documentVersions?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
