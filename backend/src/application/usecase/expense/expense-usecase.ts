import { ExpenseCategory, IExpense } from "../../../domain/entities/Expense";
import { IExpenseRepository } from "../../../domain/repository/expense-repository.interface";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/error/app-error";
import {
  CreateExpenseDTO,
  ExpenseResponseDTO,
  ExpenseTrackerSummaryDTO,
  UpdateExpenseDTO,
} from "../../dtos/expense/expense.dto";
import { IExpenseUseCases } from "../../interface/expense/expense-usecase.interface";

type RentPaymentStatus = "completed" | "pending" | "failed" | "cancelled";
type RentPaymentType =
  | "rent"
  | "security_deposit"
  | "utility"
  | "other"
  | string;

interface IRentPayment {
  amount: number;
  status: RentPaymentStatus;
  type: RentPaymentType;
  paidAt?: Date;
  dueDate: Date;
}

interface IRentPaymentRepository {
  findAll(filter?: { buildingId?: string }): Promise<IRentPayment[]>;
}

// ── helper ────────────────────────────────────────────────────────────────────
function toRes(e: IExpense): ExpenseResponseDTO {
  return {
    _id: e._id!,
    buildingId: e.buildingId,
    unitId: e.unitId,
    category: e.category,
    title: e.title,
    description: e.description,
    amount: e.amount,
    date: e.date,
    status: e.status,
    method: e.method,
    paidTo: e.paidTo,
    receiptUrl: e.receiptUrl,
    invoiceNumber: e.invoiceNumber,
    recordedBy: e.recordedBy,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

// ── date range helpers ────────────────────────────────────────────────────────
function dailyRange(
  year: number,
  month: number,
  day: number,
): { from: Date; to: Date } {
  const from = new Date(year, month - 1, day, 0, 0, 0, 0);
  const to = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { from, to };
}

function weeklyRange(
  year: number,
  month: number,
  week: number,
): { from: Date; to: Date } {
  // week 1 = days 1-7, week 2 = 8-14, etc.
  const startDay = (week - 1) * 7 + 1;
  const endDay = Math.min(startDay + 6, new Date(year, month, 0).getDate());
  const from = new Date(year, month - 1, startDay, 0, 0, 0, 0);
  const to = new Date(year, month - 1, endDay, 23, 59, 59, 999);
  return { from, to };
}

function monthlyRange(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
}

function yearlyRange(year: number): { from: Date; to: Date } {
  return {
    from: new Date(year, 0, 1, 0, 0, 0, 0),
    to: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export class ExpenseUseCases implements IExpenseUseCases {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly paymentRepo?: IRentPaymentRepository,
  ) {}

  // ── CREATE ────────────────────────────────────────────────────────────────────
  async create(data: CreateExpenseDTO): Promise<ExpenseResponseDTO> {
    if (data.amount <= 0)
      throw new BadRequestError("Amount must be greater than zero.");
    return toRes(
      await this.expenseRepo.create({
        ...data,
        date: new Date(data.date),
        status: "paid",
      }),
    );
  }

  // ── GET ALL ───────────────────────────────────────────────────────────────────
  async getAll(filter?: any): Promise<ExpenseResponseDTO[]> {
    return (await this.expenseRepo.findAll(filter)).map(toRes);
  }

  // ── GET BY ID ─────────────────────────────────────────────────────────────────
  async getById(id: string): Promise<ExpenseResponseDTO> {
    const e = await this.expenseRepo.findById(id);
    if (!e) throw new NotFoundError("Expense not found.");
    return toRes(e);
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────────
  async update(
    id: string,
    data: UpdateExpenseDTO,
  ): Promise<ExpenseResponseDTO> {
    if (!(await this.expenseRepo.existsById(id)))
      throw new NotFoundError("Expense not found.");
    const update: any = { ...data };
    if (data.date) update.date = new Date(data.date as string);
    return toRes((await this.expenseRepo.update(id, update))!);
  }

  // ── DELETE ────────────────────────────────────────────────────────────────────
  async delete(id: string): Promise<void> {
    if (!(await this.expenseRepo.existsById(id)))
      throw new NotFoundError("Expense not found.");
    await this.expenseRepo.delete(id);
  }

  // ── GET BY DATE RANGE ─────────────────────────────────────────────────────────
  async getByDateRange(
    buildingId: string,
    from: Date | string,
    to: Date | string,
    category?: ExpenseCategory,
  ): Promise<ExpenseResponseDTO[]> {
    return (
      await this.expenseRepo.findByDateRange(
        buildingId,
        new Date(from as string),
        new Date(to as string),
        category,
      )
    ).map(toRes);
  }

  // ── GET SUMMARY — the full expense tracker ────────────────────────────────────
  async getSummary(
    buildingId: string,
    period: "daily" | "weekly" | "monthly" | "yearly",
    year: number,
    month?: number,
    week?: number,
  ): Promise<ExpenseTrackerSummaryDTO> {
    // ── 1. Determine date range ───────────────────────────────────────────────
    let range: { from: Date; to: Date };
    let periodLabel: string;
    if (period === "daily" && month) {
      const day = week ?? 1; // reuse week param as day for daily
      range = dailyRange(year, month, day);
      periodLabel = `${MONTHS[month - 1]} ${day}, ${year}`;
    } else if (period === "weekly" && month && week) {
      range = weeklyRange(year, month, week);
      periodLabel = `Week ${week} of ${MONTHS[month - 1]} ${year}`;
    } else if (period === "monthly" && month) {
      range = monthlyRange(year, month);
      periodLabel = `${MONTHS[month - 1]} ${year}`;
    } else {
      // yearly
      range = yearlyRange(year);
      periodLabel = `Year ${year}`;
    }

    // ── 2. Fetch expenses in range ────────────────────────────────────────────
    const expenses = await this.expenseRepo.findByDateRange(
      buildingId,
      range.from,
      range.to,
    );
    const paidExpenses = expenses.filter((e) => e.status === "paid");
    const pendingExpenses = expenses.filter((e) => e.status === "pending");

    // ── 3. Fetch income (RentPayment) in range ────────────────────────────────
    const allPayments = this.paymentRepo
      ? await this.paymentRepo.findAll({ buildingId })
      : [];
    const incomeInRange = allPayments.filter((p) => {
      const d = p.paidAt ?? p.dueDate;
      return d >= range.from && d <= range.to;
    });

    const completedIncome = incomeInRange.filter(
      (p) => p.status === "completed",
    );
    const pendingIncome = incomeInRange.filter((p) => p.status === "pending");

    const totalIncome = completedIncome.reduce((s, p) => s + p.amount, 0);
    const totalExpenses = paidExpenses.reduce((s, e) => s + e.amount, 0);
    const pendingIncomeAmt = pendingIncome.reduce((s, p) => s + p.amount, 0);
    const pendingExpenseAmt = pendingExpenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin =
      totalIncome > 0
        ? Math.round((netProfit / totalIncome) * 100 * 10) / 10
        : 0;

    // ── 4. Breakdown income by type ───────────────────────────────────────────
    const incomeByType = {
      rent: completedIncome
        .filter((p) => p.type === "rent")
        .reduce((s, p) => s + p.amount, 0),
      securityDeposit: completedIncome
        .filter((p) => p.type === "security_deposit")
        .reduce((s, p) => s + p.amount, 0),
      utility: completedIncome
        .filter((p) => p.type === "utility")
        .reduce((s, p) => s + p.amount, 0),
      other: completedIncome
        .filter(
          (p) => !["rent", "security_deposit", "utility"].includes(p.type),
        )
        .reduce((s, p) => s + p.amount, 0),
    };

    // ── 5. Breakdown expenses by category ────────────────────────────────────
    const categoryMap = new Map<string, number>();
    paidExpenses.forEach((e) => {
      categoryMap.set(
        e.category,
        (categoryMap.get(e.category) ?? 0) + e.amount,
      );
    });
    const expenseByCategory = Array.from(categoryMap.entries())
      .map(([category, total]) => ({
        category: category as ExpenseCategory,
        total,
      }))
      .sort((a, b) => b.total - a.total);

    // ── 6. Build chart data ───────────────────────────────────────────────────
    let chart: {
      label: string;
      income: number;
      expenses: number;
      profit: number;
    }[] = [];

    if (period === "yearly") {
      chart = MONTHS.map((label, i) => {
        const monthIncome = completedIncome
          .filter((p) => {
            const d = p.paidAt ?? p.dueDate;
            return d.getMonth() === i;
          })
          .reduce((s, p) => s + p.amount, 0);

        const monthExpenses = paidExpenses
          .filter((e) => e.date.getMonth() === i)
          .reduce((s, e) => s + e.amount, 0);

        return {
          label,
          income: monthIncome,
          expenses: monthExpenses,
          profit: monthIncome - monthExpenses,
        };
      });
    } else if (period === "monthly" && month) {
      const daysInMonth = new Date(year, month, 0).getDate();
      chart = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dayIncome = completedIncome
          .filter((p) => {
            const d = p.paidAt ?? p.dueDate;
            return d.getDate() === day;
          })
          .reduce((s, p) => s + p.amount, 0);
        const dayExpense = paidExpenses
          .filter((e) => e.date.getDate() === day)
          .reduce((s, e) => s + e.amount, 0);
        return {
          label: `${day}`,
          income: dayIncome,
          expenses: dayExpense,
          profit: dayIncome - dayExpense,
        };
      });
    } else if (period === "weekly" && month && week) {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      chart = days.map((label, i) => {
        const start = weeklyRange(year, month, week).from;
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dayIncome = completedIncome
          .filter((p) => {
            const pd = p.paidAt ?? p.dueDate;
            return pd.toDateString() === d.toDateString();
          })
          .reduce((s, p) => s + p.amount, 0);
        const dayExpense = paidExpenses
          .filter((e) => e.date.toDateString() === d.toDateString())
          .reduce((s, e) => s + e.amount, 0);
        return {
          label,
          income: dayIncome,
          expenses: dayExpense,
          profit: dayIncome - dayExpense,
        };
      });
    } else {
      // daily — hourly buckets
      const hours = [
        "00-04h",
        "04-08h",
        "08-12h",
        "12-16h",
        "16-20h",
        "20-24h",
      ];
      chart = hours.map((label, i) => {
        const hStart = i * 4;
        const hEnd = hStart + 4;
        const hIncome = completedIncome
          .filter((p) => {
            const h = (p.paidAt ?? p.dueDate).getHours();
            return h >= hStart && h < hEnd;
          })
          .reduce((s, p) => s + p.amount, 0);
        const hExpense = paidExpenses
          .filter((e) => {
            const h = e.date.getHours();
            return h >= hStart && h < hEnd;
          })
          .reduce((s, e) => s + e.amount, 0);
        return {
          label,
          income: hIncome,
          expenses: hExpense,
          profit: hIncome - hExpense,
        };
      });
    }

    return {
      period: periodLabel,
      totalIncome,
      incomeByType,
      totalExpenses,
      expenseByCategory,
      netProfit,
      profitMargin,
      pendingIncome: pendingIncomeAmt,
      pendingExpenses: pendingExpenseAmt,
      chart,
    };
  }
}
