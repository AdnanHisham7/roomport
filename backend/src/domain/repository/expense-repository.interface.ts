import { ExpenseCategory, IExpense } from "../entities/Expense";

export interface IExpenseRepository {
  findById(id: string): Promise<IExpense | null>;

  findAll(
    filter?: Partial<
      Pick<IExpense, "buildingId" | "unitId" | "category" | "status">
    >,
  ): Promise<IExpense[]>;

  findByDateRange(
    buildingId: string,
    from: Date,
    to: Date,
    category?: ExpenseCategory,
  ): Promise<IExpense[]>;

  create(
    data: Omit<IExpense, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IExpense>;

  update(id: string, data: Partial<IExpense>): Promise<IExpense | null>;

  delete(id: string): Promise<boolean>;

  existsById(id: string): Promise<boolean>;

  // Aggregation: total per category for a date range
  getTotalByCategory(
    buildingId: string,
    from: Date,
    to: Date,
  ): Promise<{ category: ExpenseCategory; total: number }[]>;

  // Aggregation: daily totals for chart
  getDailyTotals(
    buildingId: string,
    from: Date,
    to: Date,
  ): Promise<{ date: string; total: number }[]>;

  // Aggregation: monthly totals for chart
  getMonthlyTotals(
    buildingId: string,
    year: number,
  ): Promise<{ month: number; total: number }[]>;
}
