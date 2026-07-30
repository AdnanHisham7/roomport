import {
  TenantLoginDTO,
  TenantPortalAuthResultDTO,
  TenantPortalDashboardDTO,
  TenantSetPasswordDTO,
} from "../../dtos/tenant-portal/tenant-portal.dto";

export interface ITenantPortalUseCases {
  login(data: TenantLoginDTO): Promise<TenantPortalAuthResultDTO>;
  setPassword(data: TenantSetPasswordDTO): Promise<TenantPortalAuthResultDTO>;
  getDashboard(tenantId: string): Promise<TenantPortalDashboardDTO>;
}
