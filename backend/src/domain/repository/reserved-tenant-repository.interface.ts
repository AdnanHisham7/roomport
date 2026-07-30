import { IReservedTenant } from "../entities/ReservedTenant";

export interface IReservedTenantRepository {
  upsertForUnit(
    unitId: string,
    data: Omit<IReservedTenant, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IReservedTenant>;

  findByUnitId(unitId: string): Promise<IReservedTenant | null>;

  deleteByUnitId(unitId: string): Promise<void>;
}
