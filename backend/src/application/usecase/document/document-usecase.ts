import type {
  DocumentType,
  IDocument,
} from "../../../domain/entities/Document";
import { IDocumentRepository } from "../../../domain/repository/document-repository.interface";
import { NotFoundError } from "../../../shared/error/app-error";
import {
  CreateDocumentDTO,
  DocumentResponseDTO,
} from "../../dtos/document/document.dto";
import { IDocumentUseCases } from "../../interface/document/document-usecase.interface";

function toResponse(d: IDocument): DocumentResponseDTO {
  return {
    _id: d._id!,
    unitId: d.unitId,
    buildingId: d.buildingId,
    tenantId: d.tenantId,
    leaseId: d.leaseId,
    type: d.type,
    title: d.title,
    description: d.description,
    fileUrl: d.fileUrl,
    fileSize: d.fileSize,
    expiryDate: d.expiryDate,
    uploadedBy: d.uploadedBy,
    documentVersions: d.documentVersions,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export class DocumentUseCases implements IDocumentUseCases {
  constructor(private readonly documentRepository: IDocumentRepository) {}

  async create(data: CreateDocumentDTO): Promise<DocumentResponseDTO> {
    const doc = await this.documentRepository.create(data);
    return toResponse(doc);
  }

  async getAll(filter?: {
    buildingId?: string;
    tenantId?: string;
    unitId?: string;
    type?: DocumentType;
  }): Promise<DocumentResponseDTO[]> {
    const docs = await this.documentRepository.findAll(filter);
    return docs.map(toResponse);
  }

  async getById(id: string): Promise<DocumentResponseDTO> {
    const doc = await this.documentRepository.findById(id);
    if (!doc) {
      throw new NotFoundError(
        "Document not found.",
        "Check the document ID and try again.",
      );
    }
    return toResponse(doc);
  }

  async delete(id: string): Promise<void> {
    const exists = await this.documentRepository.existsById(id);
    if (!exists) {
      throw new NotFoundError(
        "Document not found.",
        "Check the document ID and try again.",
      );
    }
    await this.documentRepository.delete(id);
  }
}
