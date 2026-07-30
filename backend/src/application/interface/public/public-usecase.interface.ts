import { PaginatedResult } from "../../dtos/super-admin/super-admin.dto";
import {
  PublicBuildingCardDTO,
  PublicBuildingDetailDTO,
  PublicFiltersDTO,
  PublicUnitDetailDTO,
  PublicUnitDTO,
  PublicNearbyBuildingDTO,
} from "../../dtos/public/public.dto";

export interface PublicBuildingListFilter {
  city?: string;
  state?: string;
  type?: string;
  search?: string;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  sort?: "newest" | "rent_low" | "rent_high";
}

export interface IPublicUseCases {
  listBuildings(
    filter: PublicBuildingListFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<PublicBuildingCardDTO>>;
  getFeaturedBuildings(limit: number): Promise<PublicBuildingCardDTO[]>;
  getBuildingDetail(id: string): Promise<PublicBuildingDetailDTO>;
  listUnitsForBuilding(buildingId: string): Promise<PublicUnitDTO[]>;
  getUnitDetail(id: string): Promise<PublicUnitDetailDTO>;
  getFilters(): Promise<PublicFiltersDTO>;
  getNearbyBuildings(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number,
  ): Promise<PublicNearbyBuildingDTO[]>;
}
