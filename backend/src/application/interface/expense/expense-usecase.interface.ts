import { ExpenseCategory } from "../../../domain/entities/Expense";
import {
  CreateExpenseDTO,
  ExpenseResponseDTO,
  ExpenseTrackerSummaryDTO,
  UpdateExpenseDTO,
} from "../../dtos/expense/expense.dto";

export interface IExpenseUseCases {
  // ── CRUD ──────────────────────────────────────────────────────────────────
  create(data: CreateExpenseDTO): Promise<ExpenseResponseDTO>;
  getAll(filter?: {
    buildingId?: string;
    unitId?: string;
    category?: ExpenseCategory;
    status?: string;
  }): Promise<ExpenseResponseDTO[]>;
  getById(id: string): Promise<ExpenseResponseDTO>;
  update(id: string, data: UpdateExpenseDTO): Promise<ExpenseResponseDTO>;
  delete(id: string): Promise<void>;

  // ── Tracker ───────────────────────────────────────────────────────────────
  // The main report: income vs expenses for any period
  getSummary(
    buildingId: string,
    period: "daily" | "weekly" | "monthly" | "yearly",
    year: number,
    month?: number, // required for 'daily'/'weekly'
    week?: number, // required for 'weekly'
  ): Promise<ExpenseTrackerSummaryDTO>;

  // Expenses by date range (for custom reports)
  getByDateRange(
    buildingId: string,
    from: Date | string,
    to: Date | string,
    category?: ExpenseCategory,
  ): Promise<ExpenseResponseDTO[]>;
}
