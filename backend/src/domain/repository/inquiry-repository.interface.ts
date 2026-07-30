import { IInquiry, InquiryStatus } from "../entities/Inquiry";

export interface InquiryListFilter {
  ownerId?: string;
  buildingId?: string;
  status?: InquiryStatus;
}

export interface IInquiryRepository {
  findById(id: string): Promise<IInquiry | null>;
  findAllPaginated(
    filter: InquiryListFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: IInquiry[]; total: number }>;
  countAll(filter?: InquiryListFilter): Promise<number>;
  create(
    data: Omit<IInquiry, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IInquiry>;
  update(id: string, data: Partial<IInquiry>): Promise<IInquiry | null>;
  delete(id: string): Promise<boolean>;
}
