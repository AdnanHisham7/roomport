import { IBuildingRepository } from "../../../domain/repository/building-repository.interface";
import { IUnitRepository } from "../../../domain/repository/unit-repository.interface";
import { IFloorRepository } from "../../../domain/repository/floor-repository.interface";
import { IOfferRepository } from "../../../domain/repository/offer-repository.interface";
import { IOffer } from "../../../domain/entities/Offer";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/error/app-error";
import {
  IPublicUseCases,
  PublicBuildingListFilter,
} from "../../interface/public/public-usecase.interface";
import {
  PublicBuildingCardDTO,
  PublicBuildingDetailDTO,
  PublicFiltersDTO,
  PublicUnitDetailDTO,
  PublicUnitDTO,
  PublicUnitOfferDTO,
  PublicNearbyBuildingDTO,
} from "../../dtos/public/public.dto";
import { PaginatedResult } from "../../dtos/super-admin/super-admin.dto";
import { IBuilding } from "../../../domain/entities/Building";
import { IUnit } from "../../../domain/entities/Unit";
import { UnitResponseDTO } from "../../dtos/unit/unit.dto";

function applyOffer(unit: IUnit, offer?: IOffer): PublicUnitDTO {
  let effectiveRent = unit.rentAmount;
  let activeOffer: PublicUnitOfferDTO | undefined;

  if (offer) {
    effectiveRent =
      offer.discountType === "percentage"
        ? Math.round(unit.rentAmount * (1 - offer.discountValue / 100))
        : Math.max(0, unit.rentAmount - offer.discountValue);
    activeOffer = {
      _id: offer._id!,
      title: offer.title,
      description: offer.description,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      endDate: offer.endDate,
    };
  }

  return { ...(unit as UnitResponseDTO), activeOffer, effectiveRent };
}

function buildingCard(b: IBuilding, units: IUnit[]): PublicBuildingCardDTO {
  const available = units.filter(
    (u) => u.status === "available" && !u.isOccupied,
  );
  const rents = available.map((u) => u.rentAmount).filter((r) => r > 0);
  return {
    ...(b as any),
    _id: b._id!,
    slug: b.slug,
    availableUnitsCount: available.length,
    occupiedUnitsCount: units.filter(
      (u) => u.isOccupied || u.status === "occupied",
    ).length,
    minRent: rents.length ? Math.min(...rents) : null,
    maxRent: rents.length ? Math.max(...rents) : null,
  };
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class PublicUseCases implements IPublicUseCases {
  constructor(
    private readonly buildingRepo: IBuildingRepository,
    private readonly unitRepo: IUnitRepository,
    private readonly floorRepo: IFloorRepository,
    private readonly offerRepo: IOfferRepository,
  ) {}

  async listBuildings(
    filter: PublicBuildingListFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<PublicBuildingCardDTO>> {
    const candidates = await this.buildingRepo.findAll({
      isPublished: true,
      status: "active",
      city: filter.city,
      state: filter.state,
      type: filter.type as any,
      search: filter.search,
    });
    const units = await this.unitRepo.findByBuildingIds(
      candidates.map((b) => b._id!),
    );
    const unitsByBuilding = new Map<string, IUnit[]>();
    for (const u of units) {
      const arr = unitsByBuilding.get(u.buildingId) ?? [];
      arr.push(u);
      unitsByBuilding.set(u.buildingId, arr);
    }

    let cards = candidates.map((b) =>
      buildingCard(b, unitsByBuilding.get(b._id!) ?? []),
    );
    if (filter.minRent !== undefined)
      cards = cards.filter(
        (c) => c.minRent !== null && c.minRent! >= filter.minRent!,
      );
    if (filter.maxRent !== undefined)
      cards = cards.filter(
        (c) => c.minRent !== null && c.minRent! <= filter.maxRent!,
      );
    if (filter.bedrooms !== undefined)
      cards = cards.filter((c) =>
        (unitsByBuilding.get(c._id) ?? []).some(
          (u) => u.status === "available" && u.bedrooms === filter.bedrooms,
        ),
      );

    if (filter.sort === "rent_low")
      cards.sort((a, b) => (a.minRent ?? Infinity) - (b.minRent ?? Infinity));
    else if (filter.sort === "rent_high")
      cards.sort((a, b) => (b.minRent ?? -1) - (a.minRent ?? -1));
    else
      cards.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      );

    const total = cards.length;
    return {
      data: cards.slice((page - 1) * limit, page * limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getFeaturedBuildings(limit: number): Promise<PublicBuildingCardDTO[]> {
    const featured = await this.buildingRepo.findAll({
      isPublished: true,
      isFeatured: true,
      status: "active",
    });
    const units = await this.unitRepo.findByBuildingIds(
      featured.map((b) => b._id!),
    );
    const unitsByBuilding = new Map<string, IUnit[]>();
    for (const u of units) {
      const arr = unitsByBuilding.get(u.buildingId) ?? [];
      arr.push(u);
      unitsByBuilding.set(u.buildingId, arr);
    }
    return featured
      .slice(0, limit)
      .map((b) => buildingCard(b, unitsByBuilding.get(b._id!) ?? []));
  }

  // Accepts both MongoDB _id AND URL slug
  async getBuildingDetail(idOrSlug: string): Promise<PublicBuildingDetailDTO> {
    const building = await this.buildingRepo.findByIdOrSlug(idOrSlug);
    if (!building || !building.isPublished)
      throw new NotFoundError("Listing not found.");

    this.buildingRepo
      .incrementFields(building._id!, { viewCount: 1 })
      .catch(() => {});

    const [floors, units] = await Promise.all([
      this.floorRepo.findByBuildingId(building._id!),
      this.unitRepo.findByBuildingId(building._id!),
    ]);

    const card = buildingCard(building, units);
    const floorsWithStats = floors
      .sort((a, b) => a.floorNumber - b.floorNumber)
      .map((f) => {
        const floorUnits = units.filter(
          (u) => u.floorNumber === f.floorNumber.toString(),
        );
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
          availableUnitsCount: floorUnits.filter(
            (u) => u.status === "available" && !u.isOccupied,
          ).length,
          occupiedUnitsCount: floorUnits.filter(
            (u) => u.isOccupied || u.status === "occupied",
          ).length,
        };
      });

    return { ...card, floors: floorsWithStats };
  }

  async listUnitsForBuilding(idOrSlug: string): Promise<PublicUnitDTO[]> {
    const building = await this.buildingRepo.findByIdOrSlug(idOrSlug);
    if (!building || !building.isPublished)
      throw new NotFoundError("Listing not found.");
    const units = await this.unitRepo.findByBuildingId(building._id!);
    const activeOffers = await this.offerRepo.findActiveByUnitIds(
      units.map((u) => u._id!),
      new Date(),
    );
    const offerByUnit = new Map(activeOffers.map((o) => [o.unitId, o]));
    return units.map((u) => applyOffer(u, offerByUnit.get(u._id!)));
  }

  async getUnitDetail(id: string): Promise<PublicUnitDetailDTO> {
    const unit = await this.unitRepo.findById(id);
    if (!unit) throw new NotFoundError("Room not found.");
    const building = await this.buildingRepo.findById(unit.buildingId);
    if (!building || !building.isPublished)
      throw new NotFoundError("Room not found.");
    this.unitRepo
      .update(id, { viewCount: (unit.viewCount ?? 0) + 1 })
      .catch(() => {});
    const [activeOffer] = await this.offerRepo.findActiveByUnitIds(
      [id],
      new Date(),
    );
    return {
      ...applyOffer(unit, activeOffer),
      building: {
        _id: building._id!,
        name: building.name,
        slug: building.slug,
        type: building.type,
        location: building.location,
        amenities: building.amenities,
        images: building.images,
      },
    };
  }

  async getFilters(): Promise<PublicFiltersDTO> {
    const cities = await this.buildingRepo.distinctCities();
    return {
      cities,
      types: ["residential", "commercial", "mixed", "industrial"],
    };
  }

  async getNearbyBuildings(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number,
  ): Promise<PublicNearbyBuildingDTO[]> {
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new BadRequestError(
        "Valid lat and lng query parameters are required.",
      );
    }

    const clampedRadius = Math.min(Math.max(radiusKm || 10, 1), 100);
    const clampedLimit = Math.min(Math.max(limit || 10, 1), 50);

    const latDelta = clampedRadius / 111;
    const lngDelta =
      clampedRadius / (111 * Math.cos((lat * Math.PI) / 180) || 1);

    const candidates = await this.buildingRepo.findWithinBounds({
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta,
    });

    const withDistance = candidates
      .filter(
        (b) =>
          typeof b.location?.latitude === "number" &&
          typeof b.location?.longitude === "number",
      )
      .map((b) => ({
        building: b,
        distanceKm: haversineKm(
          lat,
          lng,
          b.location.latitude as number,
          b.location.longitude as number,
        ),
      }))
      .filter((x) => x.distanceKm <= clampedRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, clampedLimit);

    if (!withDistance.length) return [];

    const units = await this.unitRepo.findByBuildingIds(
      withDistance.map((x) => x.building._id!),
    );
    const unitsByBuilding = new Map<string, IUnit[]>();
    for (const u of units) {
      const arr = unitsByBuilding.get(u.buildingId) ?? [];
      arr.push(u);
      unitsByBuilding.set(u.buildingId, arr);
    }

    return withDistance.map(({ building, distanceKm }) => ({
      ...buildingCard(building, unitsByBuilding.get(building._id!) ?? []),
      distanceKm: Math.round(distanceKm * 10) / 10,
    }));
  }
}
