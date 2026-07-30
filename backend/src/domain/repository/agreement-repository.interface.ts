import { AgreementStatus, IAgreement } from "../entities/Agreement";

export interface IAgreementRepository {
  create(
    data: Omit<IAgreement, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IAgreement>;
  findById(id: string): Promise<IAgreement | null>;
  findByTokenHash(tokenHash: string): Promise<IAgreement | null>;
  findAll(filter?: {
    tenantId?: string;
    propertyId?: string;
    status?: AgreementStatus;
  }): Promise<IAgreement[]>;
  update(id: string, data: Partial<IAgreement>): Promise<IAgreement | null>;
  existsById(id: string): Promise<boolean>;
}
