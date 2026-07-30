import { IBuilding } from "../entities/Building";

export interface BuildingListFilter {
  ownerId?: string;
  managerId?: string;
  status?: IBuilding["status"];
  type?: IBuilding["type"];
  isPublished?: boolean;
  isFeatured?: boolean;
  city?: string;
  state?: string;
  search?: string;
}

export interface IBuildingRepository {
  findById(id: string): Promise<IBuilding | null>;
  findByIdOrSlug(idOrSlug: string): Promise<IBuilding | null>;
  findBySlug(slug: string): Promise<IBuilding | null>;
  isSlugTaken(slug: string, excludeId?: string): Promise<boolean>;
  findAll(filter?: BuildingListFilter): Promise<IBuilding[]>;
  findAllPaginated(
    filter: BuildingListFilter,
    skip: number,
    limit: number,
    sort?: Record<string, 1 | -1>,
  ): Promise<{ data: IBuilding[]; total: number }>;
  findWithinBounds(bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }): Promise<IBuilding[]>;
  findByOwnerId(ownerId: string): Promise<IBuilding[]>;
  countAll(filter?: BuildingListFilter): Promise<number>;
  create(
    data: Omit<IBuilding, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IBuilding>;
  update(id: string, data: Partial<IBuilding>): Promise<IBuilding | null>;
  incrementFields(
    id: string,
    fields: Partial<Record<"totalFloors" | "totalUnits" | "viewCount", number>>,
  ): Promise<void>;
  delete(id: string): Promise<boolean>;
  existsById(id: string): Promise<boolean>;
  distinctCities(): Promise<string[]>;
}
