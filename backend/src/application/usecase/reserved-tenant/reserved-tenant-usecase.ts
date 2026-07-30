import { IReservedTenantRepository } from "../../../domain/repository/reserved-tenant-repository.interface";
import { IUnitRepository } from "../../../domain/repository/unit-repository.interface";
import { NotFoundError } from "../../../shared/error/app-error";
import { IBuildingAccessUseCase } from "../../interface/building/building-access-usecase.interface";
import { ReservedTenantResponseDTO } from "../../dtos/reserved-tenant/reserved-tenant.dto";
import { IReservedTenantUseCases } from "../../interface/reserved-tenant/reserved-tenant-usecase.interface";
import { IReservedTenant } from "../../../domain/entities/ReservedTenant";

function toResponse(r: IReservedTenant): ReservedTenantResponseDTO {
  return {
    _id: r._id!,
    buildingId: r.buildingId,
    unitId: r.unitId,
    bookingId: r.bookingId,
    ownerId: r.ownerId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    amount: r.amount,
    isPaid: r.isPaid,
    reservedAt: r.reservedAt,
  };
}

export class ReservedTenantUseCases implements IReservedTenantUseCases {
  constructor(
    private readonly reservedTenantRepo: IReservedTenantRepository,
    private readonly unitRepo: IUnitRepository,
    private readonly buildingAccessUc: IBuildingAccessUseCase,
  ) {}

  async getByUnit(
    unitId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<ReservedTenantResponseDTO | null> {
    const unit = await this.unitRepo.findById(unitId);
    if (!unit) throw new NotFoundError("Room not found.");
    await this.buildingAccessUc.assertOwnership(
      unit.buildingId,
      requesterId,
      requesterRole,
    );

    const reserved = await this.reservedTenantRepo.findByUnitId(unitId);
    return reserved ? toResponse(reserved) : null;
  }
}
