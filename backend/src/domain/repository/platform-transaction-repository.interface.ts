import {
  IPlatformTransaction,
  PlatformTransactionType,
} from "../entities/PlatformTransaction";

export interface PlatformTransactionFilter {
  ownerId?: string;
  buildingId?: string;
  bookingId?: string;
  type?: PlatformTransactionType;
}

export interface IPlatformTransactionRepository {
  create(
    data: Omit<IPlatformTransaction, "_id" | "createdAt">,
  ): Promise<IPlatformTransaction>;

  existsForBooking(
    bookingId: string,
    type: PlatformTransactionType,
  ): Promise<boolean>;

  findAllPaginated(
    filter: PlatformTransactionFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: IPlatformTransaction[]; total: number }>;

  sumByOwner(ownerId: string): Promise<{
    totalCommission: number;
    totalBuilderAmount: number;
    totalGrossCollected: number;
  }>;

  sumAllOwners(): Promise<
    { ownerId: string; totalCommission: number; totalBuilderAmount: number }[]
  >;

  platformTotals(): Promise<{
    totalCommissionEarned: number;
    totalGrossVolume: number;
  }>;
}
