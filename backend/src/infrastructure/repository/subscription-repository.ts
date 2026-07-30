import type {
  ISubscription,
  ISubscriptionPeriod,
} from "../../domain/entities/Subscription";
import type {
  ISubscriptionRepository,
  SubscriptionListFilter,
} from "../../domain/repository/subscription-repository.interface";
import {
  SubscriptionModel,
  SubscriptionPeriodModel,
} from "../db/model/subscription-model";

export class SubscriptionRepository implements ISubscriptionRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(doc: any): ISubscription {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      userId: obj.userId?.toString() ?? undefined,
    };
  }

  private toPeriodEntity(doc: any): ISubscriptionPeriod {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      subscriptionId: obj.subscriptionId?.toString() ?? undefined,
      userId: obj.userId?.toString() ?? undefined,
      paidBy: obj.paidBy?.toString() ?? undefined,
    };
  }

  async findById(subscriptionId: string): Promise<ISubscription | null> {
    const doc = await SubscriptionModel.findById(subscriptionId).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async create(
    data: Omit<ISubscription, "_id" | "createdAt" | "updatedAt">,
  ): Promise<ISubscription> {
    const doc = await SubscriptionModel.create(data);
    return this.toEntity(doc);
  }

  async update(
    subscriptionId: string,
    data: Partial<ISubscription>,
  ): Promise<ISubscription | null> {
    const doc = await SubscriptionModel.findByIdAndUpdate(
      subscriptionId,
      { $set: data },
      { new: true },
    ).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findByUserId(userId: string): Promise<ISubscription | null> {
    const active = await SubscriptionModel.findOne({
      userId,
      status: { $in: ["active", "paid"] },
    })
      .sort({ createdAt: -1 })
      .lean();
    if (active) return this.toEntity(active);
    const latest = await SubscriptionModel.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return latest ? this.toEntity(latest) : null;
  }

  async findAllByUserId(userId: string): Promise<ISubscription[]> {
    const docs = await SubscriptionModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findAllPaginated(
    filter: SubscriptionListFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: ISubscription[]; total: number }> {
    const query: Record<string, any> = {};
    if (filter.userId) query.userId = filter.userId;
    if (filter.status) query.status = filter.status;
    const [docs, total] = await Promise.all([
      SubscriptionModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SubscriptionModel.countDocuments(query),
    ]);
    return { data: docs.map((d) => this.toEntity(d)), total };
  }

  async countAll(filter?: SubscriptionListFilter): Promise<number> {
    const query: Record<string, any> = {};
    if (filter?.userId) query.userId = filter.userId;
    if (filter?.status) query.status = filter.status;
    return SubscriptionModel.countDocuments(query);
  }

  async getRevenueTotal(): Promise<number> {
    const result = await SubscriptionModel.aggregate([
      { $match: { status: { $in: ["active", "paid"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async createPeriod(
    data: Omit<ISubscriptionPeriod, "_id" | "createdAt" | "updatedAt">,
  ): Promise<ISubscriptionPeriod> {
    const doc = await SubscriptionPeriodModel.create(data);
    return this.toPeriodEntity(doc);
  }

  async findPeriodsBySubscriptionId(
    subscriptionId: string,
  ): Promise<ISubscriptionPeriod[]> {
    const docs = await SubscriptionPeriodModel.find({ subscriptionId })
      .sort({ periodStart: 1 })
      .lean();
    return docs.map((d) => this.toPeriodEntity(d));
  }

  async findPeriodById(periodId: string): Promise<ISubscriptionPeriod | null> {
    const doc = await SubscriptionPeriodModel.findById(periodId).lean();
    if (!doc) return null;
    return this.toPeriodEntity(doc);
  }

  async updatePeriod(
    periodId: string,
    data: Partial<ISubscriptionPeriod>,
  ): Promise<ISubscriptionPeriod | null> {
    const doc = await SubscriptionPeriodModel.findByIdAndUpdate(
      periodId,
      { $set: data },
      { new: true },
    ).lean();
    if (!doc) return null;
    return this.toPeriodEntity(doc);
  }

  async findAllPeriodsPaginated(
    filter: { userId?: string; subscriptionId?: string; status?: string },
    skip: number,
    limit: number,
  ): Promise<{ data: ISubscriptionPeriod[]; total: number }> {
    const query: Record<string, any> = {};
    if (filter.userId) query.userId = filter.userId;
    if (filter.subscriptionId) query.subscriptionId = filter.subscriptionId;
    if (filter.status) query.status = filter.status;
    const [docs, total] = await Promise.all([
      SubscriptionPeriodModel.find(query)
        .sort({ periodStart: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SubscriptionPeriodModel.countDocuments(query),
    ]);
    return { data: docs.map((d) => this.toPeriodEntity(d)), total };
  }

  async getAdminRevenue(): Promise<number> {
    const result = await SubscriptionPeriodModel.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async findOverlappingPendingPeriod(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ISubscriptionPeriod | null> {
    const doc = await SubscriptionPeriodModel.findOne({
      subscriptionId,
      status: "pending",
      periodStart: { $lte: periodEnd },
      periodEnd: { $gte: periodStart },
    }).lean();
    return doc ? this.toPeriodEntity(doc) : null;
  }
}
