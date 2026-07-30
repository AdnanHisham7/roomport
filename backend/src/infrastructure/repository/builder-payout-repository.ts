import mongoose from "mongoose";
import { IBuilderPayout } from "../../domain/entities/BuilderPayout";
import { IBuilderPayoutRepository } from "../../domain/repository/builder-payout-repository-impl";
import { BuilderPayoutModel } from "../db/model/builder-payout-model";

export class BuilderPayoutRepository implements IBuilderPayoutRepository {
  private toEntity(doc: any): IBuilderPayout {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: obj._id.toString(),
      builderId: obj.builderId?.toString() ?? "",
      markedBy: obj.markedBy?.toString() ?? "",
    };
  }

  async create(
    data: Omit<IBuilderPayout, "_id" | "createdAt">,
  ): Promise<IBuilderPayout> {
    const doc = await BuilderPayoutModel.create(data);
    return this.toEntity(doc);
  }

  async findByBuilder(builderId: string): Promise<IBuilderPayout[]> {
    const docs = await BuilderPayoutModel.find({ builderId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async sumByBuilder(builderId: string): Promise<number> {
    const [result] = await BuilderPayoutModel.aggregate([
      { $match: { builderId: new mongoose.Types.ObjectId(builderId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result?.total ?? 0;
  }

  async sumAllBuilders(): Promise<{ builderId: string; total: number }[]> {
    const results = await BuilderPayoutModel.aggregate([
      { $group: { _id: "$builderId", total: { $sum: "$amount" } } },
    ]);
    return results.map((r) => ({
      builderId: r._id.toString(),
      total: r.total,
    }));
  }

  async platformTotalPaidOut(): Promise<number> {
    const [result] = await BuilderPayoutModel.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result?.total ?? 0;
  }
}
