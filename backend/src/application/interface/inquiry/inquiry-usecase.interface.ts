import {
  CreateInquiryDTO,
  InquiryResponseDTO,
} from "../../dtos/inquiry/inquiry.dto";
import { InquiryStatus } from "../../../domain/entities/Inquiry";

export interface IInquiryUseCases {
  create(data: CreateInquiryDTO): Promise<InquiryResponseDTO>;
  listForOwner(
    requesterId: string,
    requesterRole: string,
    filter: { buildingId?: string; status?: InquiryStatus },
    page: number,
    limit: number,
  ): Promise<{
    data: InquiryResponseDTO[];
    total: number;
    page: number;
    limit: number;
  }>;
  getById(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<InquiryResponseDTO>;
  updateStatus(
    id: string,
    status: InquiryStatus,
    requesterId: string,
    requesterRole: string,
  ): Promise<InquiryResponseDTO>;
  delete(id: string, requesterId: string, requesterRole: string): Promise<void>;
}
