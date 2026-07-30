import { IActivityLog } from "../../domain/entities/ActivityLog";
import { IActivityLogRepository } from "../../domain/repository/activity-log-repository.interface";
import { ActivityLogModel } from "../db/model/activity-log-model";

export class ActivityLogRepositoryImpl implements IActivityLogRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(
    doc: any,
  ): IActivityLog & {
    user?: {
      _id: string;
      first_name: string;
      last_name: string;
      email: string;
      role: string;
    };
  } {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      buildingId: obj.buildingId?.toString(),
      entityId: obj.entityId?.toString(),
      unitId: obj.unitId?.toString(),
      userId: obj.userId?._id
        ? obj.userId._id.toString()
        : obj.userId?.toString(),
      user: obj.userId?._id
        ? {
            _id: obj.userId._id.toString(),
            first_name: obj.userId.first_name,
            last_name: obj.userId.last_name,
            email: obj.userId.email,
            role: obj.userId.role,
          }
        : undefined,
    };
  }

  async create(
    data: Omit<IActivityLog, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IActivityLog> {
    const doc = await ActivityLogModel.create(data);
    return this.toEntity(doc);
  }

  async findAll(filter?: Partial<IActivityLog>): Promise<IActivityLog[]> {
    const query = this.buildQuery(filter);
    const docs = await ActivityLogModel.find(query)
      .populate("userId", "first_name last_name email role")
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findAllPaginated(
    filter: Partial<IActivityLog> | undefined,
    skip: number,
    limit: number,
  ): Promise<{ data: IActivityLog[]; total: number }> {
    const query = this.buildQuery(filter);

    const [docs, total] = await Promise.all([
      ActivityLogModel.find(query)
        .populate("userId", "first_name last_name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLogModel.countDocuments(query),
    ]);
    return { data: docs.map((d) => this.toEntity(d)), total };
  }

  async findById(id: string): Promise<IActivityLog | null> {
    const doc = await ActivityLogModel.findById(id)
      .populate("userId", "first_name last_name email role")
      .lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async findByBuildingId(buildingId: string): Promise<IActivityLog[]> {
    const docs = await ActivityLogModel.find({ buildingId })
      .populate("userId", "first_name last_name email role")
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findByUserId(userId: string): Promise<IActivityLog[]> {
    const docs = await ActivityLogModel.find({ userId })
      .populate("userId", "first_name last_name email role")
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  private buildQuery(filter?: Partial<IActivityLog>): Record<string, any> {
    const query: Record<string, any> = {};
    if (filter?.action) query.action = filter.action;
    if (filter?.entityType) query.entityType = filter.entityType;
    if (filter?.buildingId) query.buildingId = filter.buildingId;
    if (filter?.entityId) query.entityId = filter.entityId;
    if (filter?.unitId) query.unitId = filter.unitId;
    if (filter?.userId) query.userId = filter.userId;
    return query;
  }
}
