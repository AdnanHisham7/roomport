import { logger } from "../../../shared/logger/logger";
import { IPaymentRecordRepository } from "../../../domain/repository/payment-record-repository.interface";
import { ITenantRepository } from "../../../domain/repository/tenant-repository.interface";
import { IPaymentRecord } from "../../../domain/entities/PaymentRecord";
import {
  ActivityLogAction,
  ActivityLogEntityType,
} from "../../../domain/entities/ActivityLog";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/error/app-error";
import { IActivityLogUsecase } from "../activity-log/activity-log-usecase";
import { IBuildingAccessUseCase } from "../../interface/building/building-access-usecase.interface";
import {
  PaymentRecordResponseDTO,
  RecordPaymentDTO,
  UpdatePaymentRecordDTO,
} from "../../dtos/payment-record/payment-record.dto";
import { IPaymentRecordUseCases } from "../../interface/payment-record/payment-record-usecase.interface";

export function buildPeriod(
  rentType: string,
  base: Date,
): { label: string; start: Date; end: Date } {
  const d = new Date(base);
  const y = d.getFullYear();
  const m = d.getMonth();

  if (rentType === "monthly") {
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59);
    return {
      label: start.toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
      start,
      end,
    };
  }
  if (rentType === "quarterly") {
    const q = Math.floor(m / 3);
    const start = new Date(y, q * 3, 1);
    const end = new Date(y, q * 3 + 3, 0, 23, 59, 59);
    return { label: `Q${q + 1} ${y}`, start, end };
  }
  if (rentType === "half_yearly") {
    const h = m < 6 ? 0 : 1;
    const start = new Date(y, h * 6, 1);
    const end = new Date(y, h * 6 + 6, 0, 23, 59, 59);
    return { label: `H${h + 1} ${y}`, start, end };
  }
  if (rentType === "yearly") {
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31, 23, 59, 59);
    return { label: `${y}`, start, end };
  }
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0, 23, 59, 59);
  return {
    label: start.toLocaleString("default", { month: "long", year: "numeric" }),
    start,
    end,
  };
}

function toResponse(record: IPaymentRecord): PaymentRecordResponseDTO {
  return {
    _id: record._id!,
    tenantId: record.tenantId,
    buildingId: record.buildingId,
    unitId: record.unitId,
    periodLabel: record.periodLabel,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    amount: record.amount,
    status: record.status,
    paidAt: record.paidAt,
    method: record.method,
    notes: record.notes,
    receiptUrl: record.receiptUrl,
    recordedBy: record.recordedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PaymentRecordUseCases implements IPaymentRecordUseCases {
  constructor(
    private readonly repo: IPaymentRecordRepository,
    private readonly tenantRepo: ITenantRepository,
    private readonly buildingAccessUc: IBuildingAccessUseCase,
    private readonly activityLogUc: IActivityLogUsecase,
  ) {}

  private async loadTenantWithAccess(
    tenantId: string,
    userId: string,
    role: string,
  ) {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundError("Tenant not found.");
    await this.buildingAccessUc.assertOwnership(
      tenant.buildingId,
      userId,
      role,
    );
    return tenant;
  }

  async listByTenant(
    tenantId: string,
    userId: string,
    role: string,
  ): Promise<PaymentRecordResponseDTO[]> {
    await this.loadTenantWithAccess(tenantId, userId, role);
    const records = await this.repo.findByTenantId(tenantId);
    return records.map(toResponse);
  }

  async record(
    tenantId: string,
    data: RecordPaymentDTO,
    userId: string,
    role: string,
  ): Promise<PaymentRecordResponseDTO> {
    const tenant = await this.loadTenantWithAccess(tenantId, userId, role);

    const {
      periodDate,
      status = "paid",
      method,
      notes,
      receiptUrl,
      amount,
    } = data;
    const base = periodDate ? new Date(periodDate) : new Date();
    const { label, start, end } = buildPeriod(tenant.rentType, base);

    const existingRecords = await this.repo.findByTenantId(tenantId);
    const duplicate = existingRecords.find((r) => {
      const rStart = new Date(r.periodStart).getTime();
      const rEnd = new Date(r.periodEnd).getTime();
      return rStart === start.getTime() && rEnd === end.getTime();
    });

    if (duplicate) {
      throw new BadRequestError(
        `A payment record already exists for the period "${label}".`,
        "Each period can only have one payment record. Update the existing record if needed.",
      );
    }

    let record: IPaymentRecord;
    try {
      record = await this.repo.create({
        tenantId: tenant._id!,
        buildingId: tenant.buildingId!,
        unitId: tenant.unitId,
        periodLabel: label,
        periodStart: start,
        periodEnd: end,
        amount: amount ?? tenant.rentAmount,
        status,
        paidAt: status === "paid" ? new Date() : undefined,
        method,
        notes,
        receiptUrl,
        recordedBy: userId,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new BadRequestError(
          `A payment record already exists for the period "${label}".`,
          "Each period can only have one payment record. Update the existing record if needed.",
        );
      }
      throw err;
    }

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.RENT_PAYMENT_CREATED,
        entityType: ActivityLogEntityType.PAYMENT,
        entityId: record._id,
        buildingId: tenant.buildingId,
        unitId: tenant.unitId,
        userId,
        description: `Rent payment of ₹${record.amount} recorded for tenant ${tenant.firstName} ${tenant.lastName} (${label}). Status: ${status}.`,
        metadata: {
          tenantId,
          periodLabel: label,
          amount: record.amount,
          status,
          method,
        },
      })
      .catch((err) => logger.error(String(err)));

    return toResponse(record);
  }

  async update(
    id: string,
    data: UpdatePaymentRecordDTO,
    userId: string,
    role: string,
  ): Promise<PaymentRecordResponseDTO> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Payment record not found.");
    await this.buildingAccessUc.assertOwnership(
      existing.buildingId,
      userId,
      role,
    );

    const record = await this.repo.update(id, {
      ...data,
      paidAt: data.paidAt !== undefined ? new Date(data.paidAt) : undefined,
    });
    if (!record) throw new NotFoundError("Payment record not found.");

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.PAYMENT_UPDATED,
        entityType: ActivityLogEntityType.PAYMENT,
        entityId: id,
        buildingId: existing.buildingId,
        unitId: existing.unitId,
        userId,
        description: `Payment record for period "${existing.periodLabel}" updated.`,
        metadata: { changes: data },
      })
      .catch((err) => logger.error(String(err)));

    return toResponse(record);
  }

  async remove(id: string, userId: string, role: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Payment record not found.");
    await this.buildingAccessUc.assertOwnership(
      existing.buildingId,
      userId,
      role,
    );

    const ok = await this.repo.delete(id);
    if (!ok) throw new NotFoundError("Payment record not found.");

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.PAYMENT_DELETED,
        entityType: ActivityLogEntityType.PAYMENT,
        entityId: id,
        buildingId: existing.buildingId,
        unitId: existing.unitId,
        userId,
        description: `Payment record for period "${existing.periodLabel}" deleted.`,
      })
      .catch((err) => logger.error(String(err)));
  }
}
