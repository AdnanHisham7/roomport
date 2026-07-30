import { IFloor } from "../../../domain/entities/Floor";
import { IBuildingRepository } from "../../../domain/repository/building-repository.interface";
import { IFloorRepository } from "../../../domain/repository/floor-repository.interface";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  PaymentRequiredError,
} from "../../../shared/error/app-error";
import {
  CreateFloorDTO,
  FloorResponseDTO,
  UpdateFloorDTO,
} from "../../dtos/floor/floor.dto";
import { IFloorUseCases } from "../../interface/floor/floor-usecase.interface";
import { IUnitUseCases } from "../../interface/unit/unit-usecase.interface";
import { IUnitRepository } from "../../../domain/repository/unit-repository.interface";
import { ISubscriptionRepository } from "../../../domain/repository/subscription-repository.interface";

function toResponse(f: IFloor): FloorResponseDTO {
  return {
    _id: f._id!,
    buildingId: f.buildingId,
    floorNumber: f.floorNumber,
    name: f.name,
    totalUnits: f.totalUnits,
    status: f.status,
    description: f.description,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

/** Generates the next `count` sequential unit numbers for a floor, continuing past whatever
 *  the highest existing suffix is (so re-growing a floor after a shrink never collides). */
function nextUnitNumbers(
  floorNumber: number,
  existingNumbers: string[],
  count: number,
): string[] {
  const prefix = `${floorNumber}`;
  let maxSuffix = 0;
  for (const num of existingNumbers) {
    const suffix = num.startsWith(prefix)
      ? num.slice(prefix.length)
      : num.replace(/^-?\d+/, "");
    const parsed = parseInt(suffix, 10);
    if (!isNaN(parsed) && parsed > maxSuffix) maxSuffix = parsed;
  }
  const result: string[] = [];
  for (let i = 1; i <= count; i++) {
    result.push(`${prefix}${(maxSuffix + i).toString().padStart(2, "0")}`);
  }
  return result;
}

export class FloorUseCases implements IFloorUseCases {
  constructor(
    private readonly floorRepo: IFloorRepository,
    private readonly buildingRepo: IBuildingRepository,
    private readonly unitUc: IUnitUseCases,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly unitRepo: IUnitRepository,
  ) {}

  // ── ownership guard ──────────────────────────────────────────────────────
  private async assertOwnership(
    buildingId: string,
    requesterId?: string,
    requesterRole?: string,
  ) {
    if (!requesterId || !requesterRole || requesterRole === "super_admin")
      return null;
    const building = await this.buildingRepo.findById(buildingId);
    if (!building)
      throw new NotFoundError(
        "Building not found.",
        "Check the buildingId and try again.",
      );
    const allowed =
      building.ownerId === requesterId || building.managerId === requesterId;
    if (!allowed) {
      throw new ForbiddenError(
        "You do not have access to this building.",
        "Only the building owner or its assigned manager can manage its floors.",
      );
    }
    return building;
  }

  // ── CREATE ────────────────────────────────────────────────────────────────────
  async create(
    data: CreateFloorDTO,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<FloorResponseDTO> {
    let building = await this.buildingRepo.findById(data.buildingId);
    if (!building) {
      throw new NotFoundError(
        "Building not found.",
        "Check the buildingId and try again.",
      );
    }
    await this.assertOwnership(data.buildingId, requesterId, requesterRole);

    // Subscription Check
    const subscription = await this.subscriptionRepo.findByUserId(
      building.ownerId,
    );
    if (
      !subscription ||
      (subscription.status !== "active" && subscription.status !== "paid")
    ) {
      throw new PaymentRequiredError(
        "Active subscription required to add floors or units.",
        "Please subscribe to a plan.",
      );
    }
    const userBuildings = await this.buildingRepo.findByOwnerId(
      building.ownerId,
    );
    const currentUnitCount = userBuildings.reduce(
      (sum, b) => sum + b.totalUnits,
      0,
    );

    if (currentUnitCount + data.totalUnits > subscription.numberOfUnits) {
      throw new PaymentRequiredError(
        "Unit limit exceeded.",
        "Please upgrade your plan unit limits to add this floor and its rooms.",
      );
    }

    // Prevent duplicate floor numbers in same building
    const duplicate = await this.floorRepo.existsByBuildingAndFloorNumber(
      data.buildingId,
      data.floorNumber,
    );
    if (duplicate) {
      throw new BadRequestError(
        `Floor number ${data.floorNumber} already exists in this building.`,
        "Use a different floor number.",
      );
    }

    const floor = await this.floorRepo.create({ ...data, status: "active" });

    // Generate rooms for this floor
    const createUnitsPromises = [];
    for (let i = 1; i <= floor.totalUnits; i++) {
      const unitNumber = `${floor.floorNumber}${i.toString().padStart(2, "0")}`;
      createUnitsPromises.push(
        this.unitUc.create(
          {
            unitNumber,
            floorNumber: floor.floorNumber.toString(),
            buildingId: floor.buildingId,
            rentAmount: 0,
            bedrooms: 1,
            bathrooms: 1,
          },
          { skipCountSync: true, skipFloorExistsCheck: true },
        ),
      );
    }
    await Promise.all(createUnitsPromises);

    // Keep building totals in sync — totalFloors grows by one, totalUnits by however many rooms were just generated.
    await this.buildingRepo.incrementFields(data.buildingId, {
      totalFloors: 1,
      totalUnits: floor.totalUnits,
    });

    return toResponse(floor);
  }

  // ── GET BY BUILDING ────────────────────────────────────────────────────────────
  async getByBuilding(buildingId: string): Promise<FloorResponseDTO[]> {
    const exists = await this.buildingRepo.existsById(buildingId);
    if (!exists)
      throw new NotFoundError(
        "Building not found.",
        "Check the buildingId and try again.",
      );

    const floors = await this.floorRepo.findByBuildingId(buildingId);
    return floors.map(toResponse);
  }

  // ── GET BY ID ──────────────────────────────────────────────────────────────────
  async getById(id: string): Promise<FloorResponseDTO> {
    const floor = await this.floorRepo.findById(id);
    if (!floor)
      throw new NotFoundError(
        "Floor not found.",
        "Check the floor ID and try again.",
      );
    return toResponse(floor);
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────────
  // Editing `totalUnits` here is what powers the "interactive room builder": raise it and
  // new room cards are instantly generated; lower it and the most-recently-added vacant
  // rooms are removed to match — never touching anything currently occupied/reserved.
  async update(
    id: string,
    data: UpdateFloorDTO,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<FloorResponseDTO> {
    const existing = await this.floorRepo.findById(id);
    if (!existing)
      throw new NotFoundError(
        "Floor not found.",
        "Check the floor ID and try again.",
      );

    await this.assertOwnership(existing.buildingId, requesterId, requesterRole);

    // If changing floorNumber, check for conflicts
    if (
      data.floorNumber !== undefined &&
      data.floorNumber !== existing.floorNumber
    ) {
      const conflict = await this.floorRepo.existsByBuildingAndFloorNumber(
        existing.buildingId,
        data.floorNumber,
      );
      if (conflict) {
        throw new BadRequestError(
          `Floor number ${data.floorNumber} already exists in this building.`,
          "Choose a different floor number.",
        );
      }
    }

    let updated = await this.floorRepo.update(id, data as any);
    if (!updated)
      throw new NotFoundError(
        "Floor not found.",
        "Check the floor ID and try again.",
      );

    if (
      data.totalUnits !== undefined &&
      data.totalUnits !== existing.totalUnits
    ) {
      const currentRooms = await this.unitRepo.findByBuildingAndFloor(
        existing.buildingId,
        existing.floorNumber.toString(),
      );
      const delta = data.totalUnits - currentRooms.length;

      if (delta > 0) {
        // Subscription cap check before growing
        const subscription = await this.subscriptionRepo.findByUserId(
          (await this.buildingRepo.findById(existing.buildingId))!.ownerId,
        );
        const userBuildings = await this.buildingRepo.findByOwnerId(
          (await this.buildingRepo.findById(existing.buildingId))!.ownerId,
        );
        const currentUnitCount = userBuildings.reduce(
          (sum, b) => sum + b.totalUnits,
          0,
        );
        if (
          !subscription ||
          (subscription.status !== "active" && subscription.status !== "paid")
        ) {
          throw new PaymentRequiredError(
            "Active subscription required to add rooms.",
            "Please subscribe to a plan.",
          );
        }
        if (currentUnitCount + delta > subscription.numberOfUnits) {
          throw new PaymentRequiredError(
            "Unit limit exceeded.",
            "Please upgrade your plan unit limits to add more rooms.",
          );
        }

        const newNumbers = nextUnitNumbers(
          existing.floorNumber,
          currentRooms.map((r) => r.unitNumber),
          delta,
        );
        await Promise.all(
          newNumbers.map((unitNumber) =>
            this.unitUc.create(
              {
                unitNumber,
                floorNumber: existing.floorNumber.toString(),
                buildingId: existing.buildingId,
                rentAmount: 0,
                bedrooms: 1,
                bathrooms: 1,
              },
              { skipCountSync: true, skipFloorExistsCheck: true },
            ),
          ),
        );
        await this.buildingRepo.incrementFields(existing.buildingId, {
          totalUnits: delta,
        });
      } else if (delta < 0) {
        const removable = currentRooms
          .filter(
            (r) =>
              !r.isOccupied &&
              r.status !== "occupied" &&
              r.status !== "reserved",
          )
          .sort((a, b) =>
            b.unitNumber.localeCompare(a.unitNumber, undefined, {
              numeric: true,
            }),
          ); // highest-numbered first

        const need = Math.abs(delta);
        if (removable.length < need) {
          // Roll back the totalUnits metadata change — can't honestly shrink further
          updated = (await this.floorRepo.update(id, {
            totalUnits: currentRooms.length,
          }))!;
          throw new BadRequestError(
            `Only ${removable.length} vacant room(s) can be removed — ${currentRooms.length - removable.length} room(s) on this floor are occupied or reserved.`,
            "Vacate or reassign those rooms first if you need to shrink the floor further.",
          );
        }

        const toRemove = removable.slice(0, need);
        await Promise.all(toRemove.map((r) => this.unitRepo.delete(r._id!)));
        await this.buildingRepo.incrementFields(existing.buildingId, {
          totalUnits: delta,
        });
      }
    }

    return toResponse(updated);
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────────
  async delete(
    id: string,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<void> {
    const floor = await this.floorRepo.findById(id);
    if (!floor)
      throw new NotFoundError(
        "Floor not found.",
        "Check the floor ID and try again.",
      );

    await this.assertOwnership(floor.buildingId, requesterId, requesterRole);

    const rooms = await this.unitRepo.findByBuildingAndFloor(
      floor.buildingId,
      floor.floorNumber.toString(),
    );
    const blocked = rooms.some(
      (r) => r.isOccupied || r.status === "occupied" || r.status === "reserved",
    );
    if (blocked) {
      throw new BadRequestError(
        "This floor has occupied or reserved rooms.",
        "Vacate every room on this floor before deleting it.",
      );
    }

    const deletedCount = await this.unitRepo.deleteByBuildingAndFloor(
      floor.buildingId,
      floor.floorNumber.toString(),
      false,
    );
    await this.floorRepo.delete(id);
    await this.buildingRepo.incrementFields(floor.buildingId, {
      totalFloors: -1,
      totalUnits: -deletedCount,
    });
  }
}
