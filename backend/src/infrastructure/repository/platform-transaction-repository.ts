import mongoose from "mongoose";
import { IPlatformTransaction } from "../../domain/entities/PlatformTransaction";
import {
  IPlatformTransactionRepository,
  PlatformTransactionFilter,
} from "../../domain/repository/platform-transaction-repository-impl";
import { PlatformTransactionModel } from "../db/model/platform-transaction-model";

export class PlatformTransactionRepository implements IPlatformTransactionRepository {
  private toEntity(doc: any): IPlatformTransaction {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: obj._id.toString(),
      bookingId: obj.bookingId?.toString() ?? "",
      buildingId: obj.buildingId?.toString() ?? "",
      ownerId: obj.ownerId?.toString() ?? "",
    };
  }

  private buildQuery(filter?: PlatformTransactionFilter): Record<string, any> {
    const q: Record<string, any> = {};
    if (filter?.ownerId) q.ownerId = filter.ownerId;
    if (filter?.buildingId) q.buildingId = filter.buildingId;
    if (filter?.bookingId) q.bookingId = filter.bookingId;
    if (filter?.type) q.type = filter.type;
    return q;
  }

  async create(
    data: Omit<IPlatformTransaction, "_id" | "createdAt">,
  ): Promise<IPlatformTransaction> {
    const doc = await PlatformTransactionModel.create(data);
    return this.toEntity(doc);
  }

  async existsForBooking(bookingId: string, type: string): Promise<boolean> {
    const doc = await PlatformTransactionModel.findOne({
      bookingId,
      type,
    }).lean();
    return !!doc;
  }

  async findAllPaginated(
    filter: PlatformTransactionFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: IPlatformTransaction[]; total: number }> {
    const q = this.buildQuery(filter);
    const [docs, total] = await Promise.all([
      PlatformTransactionModel.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PlatformTransactionModel.countDocuments(q),
    ]);
    return { data: docs.map((d) => this.toEntity(d)), total };
  }

  async sumByOwner(ownerId: string): Promise<{
    totalCommission: number;
    totalBuilderAmount: number;
    totalGrossCollected: number;
  }> {
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
    const [commissionResult, builderAmountResult, grossResult] =
      await Promise.all([
        PlatformTransactionModel.aggregate([
          { $match: { ownerId: ownerObjectId, type: "booking_payment" } },
          { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
        ]),
        PlatformTransactionModel.aggregate([
          { $match: { ownerId: ownerObjectId } },
          { $group: { _id: null, total: { $sum: "$builderAmount" } } },
        ]),
        PlatformTransactionModel.aggregate([
          { $match: { ownerId: ownerObjectId, type: "booking_payment" } },
          { $group: { _id: null, total: { $sum: "$grossAmount" } } },
        ]),
      ]);
    return {
      totalCommission: commissionResult[0]?.total ?? 0,
      totalBuilderAmount: builderAmountResult[0]?.total ?? 0,
      totalGrossCollected: grossResult[0]?.total ?? 0,
    };
  }

  async sumAllOwners(): Promise<
    { ownerId: string; totalCommission: number; totalBuilderAmount: number }[]
  > {
    const [commissionByOwner, builderAmountByOwner] = await Promise.all([
      PlatformTransactionModel.aggregate([
        { $match: { type: "booking_payment" } },
        { $group: { _id: "$ownerId", total: { $sum: "$commissionAmount" } } },
      ]),
      PlatformTransactionModel.aggregate([
        { $group: { _id: "$ownerId", total: { $sum: "$builderAmount" } } },
      ]),
    ]);
    const commissionMap = new Map(
      commissionByOwner.map((r) => [r._id.toString(), r.total]),
    );
    const builderAmountMap = new Map(
      builderAmountByOwner.map((r) => [r._id.toString(), r.total]),
    );
    const ownerIds = new Set([
      ...commissionMap.keys(),
      ...builderAmountMap.keys(),
    ]);
    return [...ownerIds].map((ownerId) => ({
      ownerId,
      totalCommission: commissionMap.get(ownerId) ?? 0,
      totalBuilderAmount: builderAmountMap.get(ownerId) ?? 0,
    }));
  }

  async platformTotals(): Promise<{
    totalCommissionEarned: number;
    totalGrossVolume: number;
  }> {
    const [result] = await PlatformTransactionModel.aggregate([
      { $match: { type: "booking_payment" } },
      {
        $group: {
          _id: null,
          totalCommissionEarned: { $sum: "$commissionAmount" },
          totalGrossVolume: { $sum: "$grossAmount" },
        },
      },
    ]);
    return {
      totalCommissionEarned: result?.totalCommissionEarned ?? 0,
      totalGrossVolume: result?.totalGrossVolume ?? 0,
    };
  }
}
