import { IOffer } from "../entities/Offer";

export interface OfferListFilter {
  buildingId?: string;
  unitId?: string;
  ownerId?: string;
  isActive?: boolean;
}

export interface IOfferRepository {
  create(
    data: Omit<IOffer, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IOffer>;

  findById(id: string): Promise<IOffer | null>;

  findAll(filter?: OfferListFilter): Promise<IOffer[]>;

  findAllPaginated(
    filter: OfferListFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: IOffer[]; total: number }>;

  findActiveByUnitIds(unitIds: string[], now: Date): Promise<IOffer[]>;

  deactivateActiveForUnit(unitId: string, excludeId?: string): Promise<void>;

  update(id: string, data: Partial<IOffer>): Promise<IOffer | null>;

  delete(id: string): Promise<boolean>;
}
