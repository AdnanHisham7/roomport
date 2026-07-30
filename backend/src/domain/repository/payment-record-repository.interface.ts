import { IPaymentRecord } from "../entities/PaymentRecord";

export interface IPaymentRecordRepository {
  create(
    data: Omit<IPaymentRecord, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IPaymentRecord>;
  findByTenantId(tenantId: string): Promise<IPaymentRecord[]>;
  findByBuildingId(buildingId: string): Promise<IPaymentRecord[]>;
  findById(id: string): Promise<IPaymentRecord | null>;
  update(
    id: string,
    data: Partial<IPaymentRecord>,
  ): Promise<IPaymentRecord | null>;
  delete(id: string): Promise<boolean>;
}
