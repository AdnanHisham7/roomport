import mongoose from "mongoose";
import { ExpenseCategory, IExpense } from "../../domain/entities/Expense";
import { IExpenseRepository } from "../../domain/repository/expense-repository.interface";
import { ExpenseModel } from "../db/model/expense-model";

export class ExpenseRepository implements IExpenseRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(doc: any): IExpense {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      buildingId: obj.buildingId?.toString() ?? "",
      unitId: obj.unitId?.toString() ?? undefined,
      recordedBy: obj.recordedBy?.toString() ?? "",
    };
  }

  // ── findById ──────────────────────────────────────────────────────────────────
  async findById(id: string): Promise<IExpense | null> {
    const doc = await ExpenseModel.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  // ── findAll ───────────────────────────────────────────────────────────────────
  async findAll(
    filter?: Partial<
      Pick<IExpense, "buildingId" | "unitId" | "category" | "status">
    >,
  ): Promise<IExpense[]> {
    const q: Record<string, any> = {};
    if (filter?.buildingId) q.buildingId = filter.buildingId;
    if (filter?.unitId) q.unitId = filter.unitId;
    if (filter?.category) q.category = filter.category;
    if (filter?.status) q.status = filter.status;

    const docs = await ExpenseModel.find(q).sort({ date: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  // ── findByDateRange ───────────────────────────────────────────────────────────
  async findByDateRange(
    buildingId: string,
    from: Date,
    to: Date,
    category?: ExpenseCategory,
  ): Promise<IExpense[]> {
    const q: Record<string, any> = {
      buildingId,
      date: { $gte: from, $lte: to },
      status: { $ne: "cancelled" },
    };
    if (category) q.category = category;

    const docs = await ExpenseModel.find(q).sort({ date: -1 }).lean();
    return docs.map((d) => this.toEntity(d));
  }

  // ── create ────────────────────────────────────────────────────────────────────
  async create(
    data: Omit<IExpense, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IExpense> {
    const doc = await ExpenseModel.create(data);
    return this.toEntity(doc);
  }

  // ── update ────────────────────────────────────────────────────────────────────
  async update(id: string, data: Partial<IExpense>): Promise<IExpense | null> {
    const doc = await ExpenseModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean();
    return doc ? this.toEntity(doc) : null;
  }

  // ── delete ────────────────────────────────────────────────────────────────────
  async delete(id: string): Promise<boolean> {
    return !!(await ExpenseModel.findByIdAndDelete(id));
  }

  async existsById(id: string): Promise<boolean> {
    return !!(await ExpenseModel.exists({ _id: id }));
  }

  // ── getTotalByCategory (aggregation) ─────────────────────────────────────────
  async getTotalByCategory(
    buildingId: string,
    from: Date,
    to: Date,
  ): Promise<{ category: ExpenseCategory; total: number }[]> {
    return ExpenseModel.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          date: { $gte: from, $lte: to },
          status: { $ne: "cancelled" },
        },
      },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $project: { category: "$_id", total: 1, _id: 0 } },
      { $sort: { total: -1 } },
    ]);
  }

  // ── getDailyTotals (aggregation) ─────────────────────────────────────────────
  async getDailyTotals(
    buildingId: string,
    from: Date,
    to: Date,
  ): Promise<{ date: string; total: number }[]> {
    return ExpenseModel.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          date: { $gte: from, $lte: to },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $project: { date: "$_id", total: 1, _id: 0 } },
      { $sort: { date: 1 } },
    ]);
  }

  // ── getMonthlyTotals (aggregation) ───────────────────────────────────────────
  async getMonthlyTotals(
    buildingId: string,
    year: number,
  ): Promise<{ month: number; total: number }[]> {
    const from = new Date(`${year}-01-01`);
    const to = new Date(`${year + 1}-01-01`);

    return ExpenseModel.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          date: { $gte: from, $lt: to },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: { $month: "$date" },
          total: { $sum: "$amount" },
        },
      },
      { $project: { month: "$_id", total: 1, _id: 0 } },
      { $sort: { month: 1 } },
    ]);
  }
}
