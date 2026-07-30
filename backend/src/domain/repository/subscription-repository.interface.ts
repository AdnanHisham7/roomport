import type {
  ISubscription,
  ISubscriptionPeriod,
} from "../entities/Subscription";

export interface SubscriptionListFilter {
  userId?: string;
  status?: string;
}

export interface ISubscriptionRepository {
  findById(subscriptionId: string): Promise<ISubscription | null>;
  create(
    data: Omit<ISubscription, "_id" | "createdAt" | "updatedAt">,
  ): Promise<ISubscription>;
  update(
    subscriptionId: string,
    data: Partial<ISubscription>,
  ): Promise<ISubscription | null>;
  findByUserId(userId: string): Promise<ISubscription | null>;
  findAllByUserId(userId: string): Promise<ISubscription[]>;
  findAllPaginated(
    filter: SubscriptionListFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: ISubscription[]; total: number }>;
  countAll(filter?: SubscriptionListFilter): Promise<number>;
  getRevenueTotal(): Promise<number>;

  createPeriod(
    data: Omit<ISubscriptionPeriod, "_id" | "createdAt" | "updatedAt">,
  ): Promise<ISubscriptionPeriod>;
  findPeriodsBySubscriptionId(
    subscriptionId: string,
  ): Promise<ISubscriptionPeriod[]>;
  findPeriodById(periodId: string): Promise<ISubscriptionPeriod | null>;
  updatePeriod(
    periodId: string,
    data: Partial<ISubscriptionPeriod>,
  ): Promise<ISubscriptionPeriod | null>;
  findAllPeriodsPaginated(
    filter: { userId?: string; subscriptionId?: string; status?: string },
    skip: number,
    limit: number,
  ): Promise<{ data: ISubscriptionPeriod[]; total: number }>;
  getAdminRevenue(): Promise<number>;

  findOverlappingPendingPeriod(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ISubscriptionPeriod | null>;
}
