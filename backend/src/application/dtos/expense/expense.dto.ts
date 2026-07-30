import {
  ExpenseCategory,
  ExpenseMethod,
  ExpenseStatus,
} from "../../../domain/entities/Expense";

// ── Create ────────────────────────────────────────────────────────────────────
export interface CreateExpenseDTO {
  buildingId: string;
  unitId?: string;
  category: ExpenseCategory;
  title: string;
  description?: string;
  amount: number;
  date: Date | string;
  method: ExpenseMethod;
  paidTo?: string;
  receiptUrl?: string;
  invoiceNumber?: string;
  recordedBy: string;
}

// ── Update ────────────────────────────────────────────────────────────────────
export interface UpdateExpenseDTO {
  category?: ExpenseCategory;
  title?: string;
  description?: string;
  amount?: number;
  date?: Date | string;
  status?: ExpenseStatus;
  method?: ExpenseMethod;
  paidTo?: string;
  receiptUrl?: string;
  invoiceNumber?: string;
}

// ── Response ──────────────────────────────────────────────────────────────────
export interface ExpenseResponseDTO {
  _id: string;
  buildingId: string;
  unitId?: string;
  category: ExpenseCategory;
  title: string;
  description?: string;
  amount: number;
  date: Date;
  status: ExpenseStatus;
  method: ExpenseMethod;
  paidTo?: string;
  receiptUrl?: string;
  invoiceNumber?: string;
  recordedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── Expense Tracker Summary (the full picture) ────────────────────────────────
export interface ExpenseTrackerSummaryDTO {
  period: string;

  // ── Income side (from RentPayment collection) ────────────────────────────
  totalIncome: number;
  incomeByType: {
    rent: number;
    securityDeposit: number;
    utility: number;
    other: number;
  };

  // ── Expense side (from Expense collection) ──────────────────────────────
  totalExpenses: number;
  expenseByCategory: { category: ExpenseCategory; total: number }[];

  // ── Net ──────────────────────────────────────────────────────────────────
  netProfit: number; // totalIncome - totalExpenses
  profitMargin: number; // (netProfit / totalIncome) * 100

  // ── Pending ───────────────────────────────────────────────────────────────
  pendingIncome: number; // rent not yet received
  pendingExpenses: number; // expenses not yet paid

  // ── Chart data (for frontend graphs) ─────────────────────────────────────
  chart: {
    label: string; // "Jan" / "Week 1" / "Mon" etc.
    income: number;
    expenses: number;
    profit: number;
  }[];
}
