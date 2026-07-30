import { logger } from "../../../shared/logger/logger";
import { IUnitRepository } from "../../../domain/repository/unit-repository.interface";
import { IFloorRepository } from "../../../domain/repository/floor-repository.interface";
import {
  CreateUnitDTO,
  UnitResponseDTO,
  UpdateUnitDTO,
} from "../../dtos/unit/unit.dto";
import {
  CreateUnitOptions,
  IUnitUseCases,
} from "../../interface/unit/unit-usecase.interface";
import { ISubscriptionRepository } from "../../../domain/repository/subscription-repository.interface";
import { IBuildingRepository } from "../../../domain/repository/building-repository.interface";
import {
  PaymentRequiredError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../../../shared/error/app-error";

export class UnitUseCases implements IUnitUseCases {
  constructor(
    private readonly unitRepository: IUnitRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly buildingRepo: IBuildingRepository,
    private readonly floorRepo: IFloorRepository,
  ) {}

  // ── ownership guard ──────────────────────────────────────────────────────
  private async assertOwnership(
    buildingId: string,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<void> {
    if (!requesterId || !requesterRole) return; // internal/system call — skip
    if (requesterRole === "super_admin") return;

    const building = await this.buildingRepo.findById(buildingId);
    if (!building) throw new NotFoundError("Building not found");

    const isOwner = building.ownerId === requesterId;
    const isManager = building.managerId === requesterId;
    if (!isOwner && !isManager) {
      throw new ForbiddenError(
        "You do not have access to this building.",
        "Only the building owner or its assigned manager can manage its rooms.",
      );
    }
  }

  async create(
    data: CreateUnitDTO,
    options: CreateUnitOptions = {},
  ): Promise<UnitResponseDTO> {
    const building = await this.buildingRepo.findById(data.buildingId);
    if (!building) throw new NotFoundError("Building not found");

    const subscription = await this.subscriptionRepo.findByUserId(
      building.ownerId,
    );
    if (
      !subscription ||
      (subscription.status !== "active" && subscription.status !== "paid")
    ) {
      throw new PaymentRequiredError(
        "Active subscription required.",
        "Please subscribe to a plan to add units.",
      );
    }

    const userBuildings = await this.buildingRepo.findByOwnerId(
      building.ownerId,
    );
    const currentUnitCount = userBuildings.reduce(
      (sum, b) => sum + b.totalUnits,
      0,
    );

    if (currentUnitCount >= subscription.numberOfUnits) {
      throw new PaymentRequiredError(
        "Unit limit exceeded.",
        "Please upgrade your plan unit limits to add more units.",
      );
    }

    let floor = null;
    if (!options.skipFloorExistsCheck) {
      floor = await this.floorRepo.findByBuildingAndFloorNumber(
        data.buildingId,
        Number(data.floorNumber),
      );
      if (!floor) {
        throw new NotFoundError(
          "Floor not found.",
          `Create floor "${data.floorNumber}" first before adding a room to it.`,
        );
      }
    }

    const unitData = {
      ...data,
      isOccupied: data.isOccupied ?? false,
      status: data.status ?? ("available" as const),
    };

    const unit = await this.unitRepository.create(unitData);

    if (!options.skipCountSync) {
      if (floor?._id)
        await this.floorRepo.update(floor._id, {
          totalUnits: floor.totalUnits + 1,
        });
      await this.buildingRepo.incrementFields(data.buildingId, {
        totalUnits: 1,
      });
    }

    return unit as UnitResponseDTO;
  }

  async getAll(filter?: {
    buildingId?: string;
    status?: string;
    isOccupied?: boolean;
  }): Promise<UnitResponseDTO[]> {
    const units = await this.unitRepository.findAll(filter as any);
    return units as UnitResponseDTO[];
  }

  async getById(id: string): Promise<UnitResponseDTO> {
    const unit = await this.unitRepository.findById(id);
    if (!unit) throw new NotFoundError("Unit not found");
    return unit as UnitResponseDTO;
  }

  async update(
    id: string,
    data: UpdateUnitDTO,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<UnitResponseDTO> {
    const existingUnit = await this.unitRepository.findById(id);
    if (!existingUnit) throw new NotFoundError("Unit not found");

    await this.assertOwnership(
      existingUnit.buildingId,
      requesterId,
      requesterRole,
    );

    const building = await this.buildingRepo.findById(existingUnit.buildingId);
    if (building) {
      const subscription = await this.subscriptionRepo.findByUserId(
        building.ownerId,
      );
      if (
        !subscription ||
        (subscription.status !== "active" && subscription.status !== "paid")
      ) {
        throw new PaymentRequiredError(
          "Active subscription required.",
          "Please subscribe to a plan to edit units.",
        );
      }
    }

    // Keep isOccupied / status in sync with each other when one is set explicitly
    const patch: UpdateUnitDTO = { ...data };
    if (patch.status === "occupied") patch.isOccupied = true;
    if (patch.status === "available") patch.isOccupied = false;
    if (patch.isOccupied === true && !patch.status) patch.status = "occupied";
    if (
      patch.isOccupied === false &&
      !patch.status &&
      existingUnit.status === "occupied"
    )
      patch.status = "available";

    const unit = await this.unitRepository.update(id, patch);
    if (!unit) throw new NotFoundError("Unit not found");
    return unit as UnitResponseDTO;
  }

  async bulkUpdate(
    unitIds: string[],
    data: UpdateUnitDTO,
  ): Promise<UnitResponseDTO[]> {
    const promises = unitIds.map((id) =>
      this.update(id, data).catch((err) => {
        logger.error(`Failed to update unit ${id}:`, err);
        return null;
      }),
    );
    const results = await Promise.all(promises);
    return results.filter(Boolean) as UnitResponseDTO[];
  }

  async delete(
    id: string,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<void> {
    const unit = await this.unitRepository.findById(id);
    if (!unit) throw new NotFoundError("Unit not found");

    await this.assertOwnership(unit.buildingId, requesterId, requesterRole);

    if (
      unit.isOccupied ||
      unit.status === "occupied" ||
      unit.status === "reserved"
    ) {
      throw new BadRequestError(
        "This room is currently occupied or reserved.",
        "Vacate the tenant or change the room status before deleting it.",
      );
    }

    await this.unitRepository.delete(id);

    const floor = await this.floorRepo.findByBuildingAndFloorNumber(
      unit.buildingId,
      Number(unit.floorNumber),
    );
    if (floor?._id) {
      await this.floorRepo.update(floor._id, {
        totalUnits: Math.max(0, floor.totalUnits - 1),
      });
    }
    await this.buildingRepo.incrementFields(unit.buildingId, {
      totalUnits: -1,
    });
  }
}
