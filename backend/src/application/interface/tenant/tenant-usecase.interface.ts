import {
  CreateTenantDTO,
  TenantResponseDTO,
  UpdateTenantDTO,
} from "../../dtos/tenant/tenant.dto";

export interface ITenantUseCases {
  create(data: CreateTenantDTO): Promise<TenantResponseDTO>;
  getAll(filter?: {
    buildingId?: string;
    unitId?: string;
    status?: string;
    ownerId?: string;
  }): Promise<TenantResponseDTO[]>;
  getById(id: string, ownerId?: string): Promise<TenantResponseDTO>;
  update(
    id: string,
    data: UpdateTenantDTO,
    ownerId?: string,
  ): Promise<TenantResponseDTO>;
  delete(id: string, ownerId?: string): Promise<void>;
  getTenantLeases(tenantId: string): Promise<any[]>;
  transferTenant(
    tenantId: string,
    targetUnitId: string,
    adminUserId: string,
    ownerId?: string,
  ): Promise<{ tenant: TenantResponseDTO; message: string }>;
  setPortalAccess(
    id: string,
    enabled: boolean,
    ownerId?: string,
  ): Promise<TenantResponseDTO>;
}
