import type { ITenant } from "../entities/Tenant.js";

export interface ITenantRepository {
  findById(id: string): Promise<ITenant | null>;
  findAll(
    filter?: Partial<Pick<ITenant, "buildingId" | "unitId" | "status">> & {
      createdBy?: string;
    },
  ): Promise<ITenant[]>;
  findByBuildingId(buildingId: string): Promise<ITenant[]>;
  findByEmail(email: string): Promise<ITenant[]>;
  create(
    data: Omit<ITenant, "_id" | "createdAt" | "updatedAt">,
  ): Promise<ITenant>;
  update(id: string, data: Partial<ITenant>): Promise<ITenant | null>;
  delete(id: string): Promise<boolean>;
  existsById(id: string): Promise<boolean>;
}
