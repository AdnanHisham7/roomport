import { logger } from "../../../shared/logger/logger";
import { IBuilding, generateSlug } from "../../../domain/entities/Building";
import { IBuildingRepository } from "../../../domain/repository/building-repository.interface";
import { IFloorUseCases } from "../../interface/floor/floor-usecase.interface";
import { IBuildingUseCases } from "../../interface/building/building-usecase.interface";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  PaymentRequiredError,
} from "../../../shared/error/app-error";
import { ISubscriptionRepository } from "../../../domain/repository/subscription-repository.interface";
import {
  BuildingOccupancyStatsDTO,
  BuildingResponseDTO,
  CreateBuildingDTO,
  UpdateBuildingDTO,
} from "../../dtos/building/building.dto";
import { IActivityLogUsecase } from "../../usecase/activity-log/activity-log-usecase";
import {
  ActivityLogAction,
  ActivityLogEntityType,
} from "../../../domain/entities/ActivityLog";
import { IUnitRepository } from "../../../domain/repository/unit-repository.interface";

function toResponse(b: IBuilding): BuildingResponseDTO {
  return {
    _id: b._id!,
    name: b.name,
    slug: b.slug,
    type: b.type,
    status: b.status,
    location: b.location,
    ownerId: b.ownerId,
    managerId: b.managerId,
    totalUnits: b.totalUnits,
    totalFloors: b.totalFloors,
    sqft: b.sqft,
    lift: b.lift,
    helipad: b.helipad,
    nearAirport: b.nearAirport,
    nearRailwayStation: b.nearRailwayStation,
    nearBusStand: b.nearBusStand,
    nearPark: b.nearPark,
    amenities: b.amenities,
    images: b.images,
    documents: b.documents,
    description: b.description,
    yearOfBuild: b.yearOfBuild,
    isPublished: b.isPublished ?? true,
    isFeatured: b.isFeatured ?? false,
    viewCount: b.viewCount ?? 0,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export class BuildingUseCases implements IBuildingUseCases {
  constructor(
    private readonly buildingRepo: IBuildingRepository,
    private readonly floorUc: IFloorUseCases,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly activityLogUc: IActivityLogUsecase,
    private readonly unitRepo: IUnitRepository,
  ) {}

  private async assertOwnership(
    building: IBuilding,
    requesterId?: string,
    requesterRole?: string,
  ) {
    if (!requesterId || !requesterRole || requesterRole === "super_admin")
      return;
    if (
      building.ownerId !== requesterId &&
      building.managerId !== requesterId
    ) {
      throw new ForbiddenError(
        "You do not have access to this building.",
        "Only the building owner or its assigned manager can manage it.",
      );
    }
  }

  private async uniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = generateSlug(name);
    if (!(await this.buildingRepo.isSlugTaken(base, excludeId))) return base;
    for (let i = 1; i < 20; i++) {
      const candidate = `${base}-${i}`;
      if (!(await this.buildingRepo.isSlugTaken(candidate, excludeId)))
        return candidate;
    }
    return `${base}-${Date.now()}`;
  }

  async createFloors(
    floorData: {
      buildingId: string;
      floorNumber: number;
      name: string;
      totalUnits: number;
    }[],
    requesterId?: string,
    requesterRole?: string,
  ): Promise<void> {
    for (const data of floorData) {
      await this.floorUc.create(
        { ...data, description: "" },
        requesterId,
        requesterRole,
      );
    }
  }

  async create(data: CreateBuildingDTO): Promise<BuildingResponseDTO> {
    if (data.totalUnits < 1)
      throw new BadRequestError("totalUnits must be at least 1.");
    if (data.totalFloors < 1)
      throw new BadRequestError("totalFloors must be at least 1.");
    if (
      !data.location?.address ||
      !data.location?.city ||
      !data.location?.state ||
      !data.location?.pincode
    )
      throw new BadRequestError(
        "location (address, city, state, pincode) is required.",
      );

    const subscription = await this.subscriptionRepo.findByUserId(data.ownerId);
    if (
      !subscription ||
      (subscription.status !== "active" && subscription.status !== "paid")
    ) {
      throw new PaymentRequiredError(
        "Active subscription required to create a building.",
        "Please subscribe to a plan.",
      );
    }
    const userBuildings = await this.buildingRepo.findByOwnerId(data.ownerId);
    if (userBuildings.length + 1 > subscription.numberOfBuildings) {
      throw new PaymentRequiredError(
        "Building limit exceeded.",
        "Please upgrade your plan to create more buildings.",
      );
    }
    const currentUnitCount = userBuildings.reduce(
      (sum, b) => sum + b.totalUnits,
      0,
    );
    if (currentUnitCount + data.totalUnits > subscription.numberOfUnits) {
      throw new PaymentRequiredError(
        "Unit limit exceeded.",
        "Please upgrade your plan unit limits.",
      );
    }

    const slug = await this.uniqueSlug(data.name);

    const b = await this.buildingRepo.create({
      ...data,
      slug,
      lift: data.lift ?? false,
      helipad: data.helipad ?? false,
      status: "active",
      isPublished: data.isPublished ?? true,
      isFeatured: false,
      viewCount: 0,
      totalFloors: 0,
      totalUnits: 0,
    });

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BUILDING_CREATED,
        entityType: ActivityLogEntityType.BUILDING,
        entityId: b._id,
        buildingId: b._id,
        userId: b.ownerId as any,
        metadata: { name: b.name, totalUnits: data.totalUnits },
      })
      .catch((err) => logger.error(String(err)));
    return toResponse(b);
  }

  async getAll(filter?: any): Promise<BuildingResponseDTO[]> {
    return (await this.buildingRepo.findAll(filter)).map(toResponse);
  }

  async getById(id: string): Promise<BuildingResponseDTO> {
    const b = await this.buildingRepo.findById(id);
    if (!b) throw new NotFoundError("Building not found.");
    return toResponse(b);
  }

  async update(
    id: string,
    data: UpdateBuildingDTO,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<BuildingResponseDTO> {
    const prev = await this.buildingRepo.findById(id);
    if (!prev) throw new NotFoundError("Building not found.");
    await this.assertOwnership(prev, requesterId, requesterRole);

    const { totalUnits, totalFloors, ...safeData } = data as any;
    if (requesterRole !== "super_admin") delete (safeData as any).isFeatured;

    // Re-generate slug only when name changes
    if (safeData.name && safeData.name !== prev.name) {
      safeData.slug = await this.uniqueSlug(safeData.name, id);
    }

    const updated = await this.buildingRepo.update(id, safeData);
    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BUILDING_UPDATED,
        entityType: ActivityLogEntityType.BUILDING,
        entityId: updated!._id,
        buildingId: updated!._id,
        userId: (requesterId || updated!.ownerId) as any,
        metadata: { changes_keys: Object.keys(safeData) },
      })
      .catch((err) => logger.error(String(err)));
    return toResponse(updated!);
  }

  async delete(
    id: string,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<void> {
    const prev = await this.buildingRepo.findById(id);
    if (!prev) throw new NotFoundError("Building not found.");
    await this.assertOwnership(prev, requesterId, requesterRole);

    const occupied = await this.unitRepo.countByBuildingId(id, {
      isOccupied: true,
    });
    if (occupied > 0)
      throw new BadRequestError(
        `This building still has ${occupied} occupied room(s).`,
        "Vacate every tenant before deleting the building.",
      );

    await this.unitRepo
      .findByBuildingId(id)
      .then((units) =>
        Promise.all(units.map((u) => this.unitRepo.delete(u._id!))),
      );
    await this.buildingRepo.delete(id);

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BUILDING_DELETED,
        entityType: ActivityLogEntityType.BUILDING,
        entityId: id,
        buildingId: id,
        userId: (requesterId || prev.ownerId) as any,
      })
      .catch((err) => logger.error(String(err)));
  }

  async getOccupancyStats(
    ownerId?: string,
  ): Promise<BuildingOccupancyStatsDTO> {
    const buildings = await this.buildingRepo.findAll(
      ownerId ? { ownerId } : undefined,
    );
    const byBuilding = await Promise.all(
      buildings.map(async (b) => {
        const [occupiedUnits, totalRoomsActual] = await Promise.all([
          this.unitRepo.countByBuildingId(b._id!, { isOccupied: true }),
          this.unitRepo.countByBuildingId(b._id!),
        ]);
        const vacantUnits = Math.max(0, totalRoomsActual - occupiedUnits);
        const occupancyRate =
          totalRoomsActual > 0
            ? Math.round((occupiedUnits / totalRoomsActual) * 1000) / 10
            : 0;
        return {
          _id: b._id!,
          name: b.name,
          totalUnits: totalRoomsActual,
          occupiedUnits,
          vacantUnits,
          occupancyRate,
        };
      }),
    );
    const totalUnits = byBuilding.reduce((s, b) => s + b.totalUnits, 0);
    const occupiedUnits = byBuilding.reduce((s, b) => s + b.occupiedUnits, 0);
    const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
    const occupancyRate =
      totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0;
    return {
      totalBuildings: buildings.length,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
      byBuilding,
    };
  }
}
