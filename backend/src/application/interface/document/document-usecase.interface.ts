import type { DocumentType } from "../../../domain/entities/Document";
import {
  CreateDocumentDTO,
  DocumentResponseDTO,
} from "../../dtos/document/document.dto";

export interface IDocumentUseCases {
  create(data: CreateDocumentDTO): Promise<DocumentResponseDTO>;
  getAll(filter?: {
    buildingId?: string;
    tenantId?: string;
    unitId?: string;
    type?: DocumentType;
  }): Promise<DocumentResponseDTO[]>;
  getById(id: string): Promise<DocumentResponseDTO>;
  delete(id: string): Promise<void>;
}
