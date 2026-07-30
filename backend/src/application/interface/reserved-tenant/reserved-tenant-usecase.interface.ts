import { ReservedTenantResponseDTO } from "../../dtos/reserved-tenant/reserved-tenant.dto";

export interface IReservedTenantUseCases {
  getByUnit(
    unitId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<ReservedTenantResponseDTO | null>;
}
