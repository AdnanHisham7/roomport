import { env } from "../../../infrastructure/config/env";
import { logger } from "../../../shared/logger/logger";
import { ISubscriptionRepository } from "../../../domain/repository/subscription-repository.interface";
import { IPlatformSettingRepository } from "../../../domain/repository/platform-setting-repository.interface";
import {
  ISubscription,
  ISubscriptionPeriod,
  BillingCycle,
} from "../../../domain/entities/Subscription";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/error/app-error";
import {
  CreateBuilderSubscriptionDTO,
  AdminUpdateSubscriptionDTO,
  MarkPeriodPaidDTO,
  SubscriptionResponseDTO,
  SubscriptionPeriodResponseDTO,
  DemoRequestDTO,
  UpgradeRequestDTO,
} from "../../dtos/subscription/subscription.dto";
import { IUserRepository } from "../../../domain/repository/user-repository.interface";
import { IActivityLogUsecase } from "../activity-log/activity-log-usecase";
import {
  ActivityLogAction,
  ActivityLogEntityType,
} from "../../../domain/entities/ActivityLog";
import { DemoRequestModel } from "../../../infrastructure/db/model/demo-request-model";
import { NotificationModel } from "../../../infrastructure/db/model/notification-model";
import {
  UpgradeRequestModel,
  IUpgradeRequest,
} from "../../../infrastructure/db/model/upgrade-request-model";
import type { IEmailService } from "../../interface/common/email-service-usecase.interface";

function toResponse(s: ISubscription): SubscriptionResponseDTO {
  return {
    _id: s._id!.toString(),
    userId: s.userId.toString(),
    amount: s.amount,
    numberOfBuildings: s.numberOfBuildings,
    numberOfUnits: s.numberOfUnits,
    billingCycle: s.billingCycle,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    dueDate: s.dueDate,
    paidAt: s.paidAt,
    status: s.status,
    paymentMethod: s.paymentMethod,
    invoicenumber: s.invoicenumber,
    notes: s.notes,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function toPeriodResponse(
  p: ISubscriptionPeriod,
): SubscriptionPeriodResponseDTO {
  return {
    _id: p._id!.toString(),
    subscriptionId: p.subscriptionId.toString(),
    userId: p.userId.toString(),
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    periodLabel: p.periodLabel,
    amount: p.amount,
    status: p.status,
    paidAt: p.paidAt,
    notes: p.notes,
    createdAt: p.createdAt,
  };
}

function buildPeriodDates(
  start: Date,
  cycle: BillingCycle,
): { end: Date; label: string } {
  const end = new Date(start);
  if (cycle === "monthly") {
    end.setMonth(end.getMonth() + 1);
    return {
      end,
      label: start.toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
    };
  } else {
    end.setFullYear(end.getFullYear() + 1);
    return { end, label: `${start.getFullYear()}–${end.getFullYear()}` };
  }
}

function computeFullAmount(
  buildings: number,
  units: number,
  cycle: BillingCycle,
  pricing: {
    monthlyPricePerBuilding: number;
    monthlyPricePerUnit: number;
    yearlyPricePerBuilding: number;
    yearlyPricePerUnit: number;
  },
): number {
  if (cycle === "monthly") {
    return (
      buildings * pricing.monthlyPricePerBuilding +
      units * pricing.monthlyPricePerUnit
    );
  }
  return (
    buildings * pricing.yearlyPricePerBuilding +
    units * pricing.yearlyPricePerUnit
  );
}

function computeProRatedAmount(
  buildings: number,
  units: number,
  cycle: BillingCycle,
  pricing: {
    monthlyPricePerBuilding: number;
    monthlyPricePerUnit: number;
    yearlyPricePerBuilding: number;
    yearlyPricePerUnit: number;
  },
  partialStart: Date,
  periodEnd: Date,
): number {
  const fullAmount = computeFullAmount(buildings, units, cycle, pricing);
  const totalDaysInCycle = cycle === "monthly" ? 30 : 365;
  const msInDay = 1000 * 60 * 60 * 24;
  const remainingDays = Math.max(
    1,
    Math.round((periodEnd.getTime() - partialStart.getTime()) / msInDay),
  );
  return Math.round(fullAmount * (remainingDays / totalDaysInCycle));
}

export class SubscriptionUseCases {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly settingRepo: IPlatformSettingRepository,
    private readonly userRepo: IUserRepository,
    private readonly activityLogUc: IActivityLogUsecase,
    private readonly emailService: IEmailService,
  ) {}

  async getPricing(): Promise<{
    monthlyPricePerBuilding: number;
    monthlyPricePerUnit: number;
    yearlyPricePerBuilding: number;
    yearlyPricePerUnit: number;
    currency: string;
    pricePerBuilding: number;
    pricePerUnit: number;
  }> {
    const s = await this.settingRepo.get();
    return {
      monthlyPricePerBuilding: s.monthlyPricePerBuilding ?? s.pricePerBuilding,
      monthlyPricePerUnit: s.monthlyPricePerUnit ?? s.pricePerUnit,
      yearlyPricePerBuilding:
        s.yearlyPricePerBuilding ?? s.pricePerBuilding * 10,
      yearlyPricePerUnit: s.yearlyPricePerUnit ?? s.pricePerUnit * 10,
      pricePerBuilding: s.pricePerBuilding,
      pricePerUnit: s.pricePerUnit,
      currency: s.currency,
    };
  }

  async createBuilderSubscription(
    data: CreateBuilderSubscriptionDTO,
    adminUserId: string,
  ): Promise<{
    subscription: SubscriptionResponseDTO;
    firstPeriod: SubscriptionPeriodResponseDTO;
  }> {
    if (data.numberOfBuildings < 1)
      throw new BadRequestError("numberOfBuildings must be at least 1.");
    if (data.numberOfUnits < 1)
      throw new BadRequestError("numberOfUnits must be at least 1.");

    const user = await this.userRepo.findById(data.userId);
    if (!user) throw new NotFoundError("Builder not found.");

    const existingSub = await this.subscriptionRepo.findByUserId(data.userId);
    if (existingSub) {
      throw new BadRequestError(
        "A subscription already exists for this builder.",
        "Use the admin update endpoint to modify the existing subscription.",
      );
    }

    const periodStart = new Date();
    const { end: periodEnd, label: periodLabel } = buildPeriodDates(
      periodStart,
      data.billingCycle,
    );

    const sub = await this.subscriptionRepo.create({
      userId: data.userId,
      amount: data.amount,
      numberOfBuildings: data.numberOfBuildings,
      numberOfUnits: data.numberOfUnits,
      billingCycle: data.billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      dueDate: periodEnd,
      status: "active",
      notes: data.notes,
    });

    const firstPeriod = await this.subscriptionRepo.createPeriod({
      subscriptionId: sub._id!,
      userId: data.userId,
      periodStart,
      periodEnd,
      periodLabel,
      amount: data.amount,
      status: "pending",
    });

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.SUBSCRIPTION_CREATED,
        entityType: ActivityLogEntityType.SUBSCRIPTION,
        entityId: sub._id!.toString(),
        userId: adminUserId,
        description: `Subscription created for ${user.first_name} ${user.last_name}. Cycle: ${data.billingCycle}, Buildings: ${data.numberOfBuildings}, Units: ${data.numberOfUnits}, Amount: ₹${data.amount}.`,
        metadata: {
          billingCycle: data.billingCycle,
          numberOfBuildings: data.numberOfBuildings,
          numberOfUnits: data.numberOfUnits,
          amount: data.amount,
        },
      })
      .catch((err) => logger.error(String(err)));

    return {
      subscription: toResponse(sub),
      firstPeriod: toPeriodResponse(firstPeriod),
    };
  }

  async getMine(userId: string): Promise<SubscriptionResponseDTO | null> {
    const sub = await this.subscriptionRepo.findByUserId(userId);
    return sub ? toResponse(sub) : null;
  }

  async getMyPeriods(userId: string): Promise<SubscriptionPeriodResponseDTO[]> {
    const sub = await this.subscriptionRepo.findByUserId(userId);
    if (!sub) return [];
    const periods = await this.subscriptionRepo.findPeriodsBySubscriptionId(
      sub._id!.toString(),
    );
    return periods.map(toPeriodResponse);
  }

  async isSubscriptionActive(userId: string): Promise<boolean> {
    const sub = await this.subscriptionRepo.findByUserId(userId);
    if (!sub || sub.status !== "active") return false;
    const periods = await this.subscriptionRepo.findPeriodsBySubscriptionId(
      sub._id!.toString(),
    );
    const now = new Date();
    return periods.some(
      (p) =>
        p.status === "paid" &&
        new Date(p.periodStart) <= now &&
        new Date(p.periodEnd) >= now,
    );
  }

  async getHistory(userId: string): Promise<SubscriptionResponseDTO[]> {
    const subs = await this.subscriptionRepo.findAllByUserId(userId);
    return subs.map(toResponse);
  }

  async listAll(
    filter: { userId?: string; status?: string },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const { data, total } = await this.subscriptionRepo.findAllPaginated(
      filter,
      skip,
      limit,
    );
    return { data: data.map(toResponse), total, page, limit };
  }

  async listPeriods(
    filter: { userId?: string; subscriptionId?: string; status?: string },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const { data, total } = await this.subscriptionRepo.findAllPeriodsPaginated(
      filter,
      skip,
      limit,
    );
    return { data: data.map(toPeriodResponse), total, page, limit };
  }

  /**
   * Called at login for builder/admin roles.
   * Checks if the most recent paid period has ended and no pending period exists
   * for the next cycle window. If so, creates one automatically.
   * This is idempotent — safe to call every login.
   */
  async renewExpiredPeriodIfNeeded(userId: string): Promise<void> {
    try {
      const sub = await this.subscriptionRepo.findByUserId(userId);
      if (!sub || sub.status !== "active") return;

      const now = new Date();
      const periods = await this.subscriptionRepo.findPeriodsBySubscriptionId(
        sub._id!.toString(),
      );

      const currentActivePaid = periods.find(
        (p) =>
          p.status === "paid" &&
          new Date(p.periodStart) <= now &&
          new Date(p.periodEnd) >= now,
      );

      if (currentActivePaid) return;

      const latestPaidPeriod = periods
        .filter((p) => p.status === "paid")
        .sort(
          (a, b) =>
            new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime(),
        )[0];

      if (!latestPaidPeriod) return;

      const lastPaidEnd = new Date(latestPaidPeriod.periodEnd);
      if (lastPaidEnd > now) return;

      const nextStart = new Date(lastPaidEnd);
      const { end: nextEnd, label: nextLabel } = buildPeriodDates(
        nextStart,
        sub.billingCycle,
      );

      const existingPending =
        await this.subscriptionRepo.findOverlappingPendingPeriod(
          sub._id!.toString(),
          nextStart,
          nextEnd,
        );

      if (existingPending) return;

      const pricing = await this.settingRepo.get();
      const pricingConfig = {
        monthlyPricePerBuilding:
          pricing.monthlyPricePerBuilding ?? pricing.pricePerBuilding,
        monthlyPricePerUnit:
          pricing.monthlyPricePerUnit ?? pricing.pricePerUnit,
        yearlyPricePerBuilding:
          pricing.yearlyPricePerBuilding ?? pricing.pricePerBuilding * 10,
        yearlyPricePerUnit:
          pricing.yearlyPricePerUnit ?? pricing.pricePerUnit * 10,
      };

      const nextAmount = computeFullAmount(
        sub.numberOfBuildings,
        sub.numberOfUnits,
        sub.billingCycle,
        pricingConfig,
      );

      await this.subscriptionRepo.createPeriod({
        subscriptionId: sub._id!,
        userId: sub.userId,
        periodStart: nextStart,
        periodEnd: nextEnd,
        periodLabel: nextLabel,
        amount: nextAmount,
        status: "pending",
      });

      await this.subscriptionRepo.update(sub._id!.toString(), {
        currentPeriodStart: nextStart,
        currentPeriodEnd: nextEnd,
        dueDate: nextEnd,
      });

      NotificationModel.create({
        userId: sub.userId,
        title: "New Billing Period",
        message: `A new billing period \"${nextLabel}\" (₹${nextAmount}) has been created. Please arrange payment to maintain access.`,
        notificationType: "general",
        channel: "in_app",
        type: "payment_pending",
        metadata: { periodLabel: nextLabel, amount: String(nextAmount) },
      }).catch((err) => logger.error(String(err)));
    } catch (err) {
      logger.error("[renewExpiredPeriodIfNeeded] Non-fatal error:", err);
    }
  }

  async markPeriodPaid(
    periodId: string,
    adminUserId: string,
    data: MarkPeriodPaidDTO,
  ): Promise<SubscriptionPeriodResponseDTO> {
    const period = await this.subscriptionRepo.findPeriodById(periodId);
    if (!period) throw new NotFoundError("Subscription period not found.");

    if (period.status === "paid") {
      throw new BadRequestError("This period is already marked as paid.");
    }

    const updated = await this.subscriptionRepo.updatePeriod(periodId, {
      status: "paid",
      paidAt: data.paidAt ?? new Date(),
      paidBy: adminUserId,
      notes: data.notes,
    });

    const sub = await this.subscriptionRepo.findById(
      period.subscriptionId.toString(),
    );
    if (sub) {
      // const nextStart = new Date(updated!.periodEnd);
      // const { end: nextEnd, label: nextLabel } = buildPeriodDates(nextStart, sub.billingCycle);

      // const existingNext = await this.subscriptionRepo.findOverlappingPendingPeriod(
      //   sub._id!.toString(),
      //   nextStart,
      //   nextEnd
      // );

      // await this.subscriptionRepo.update(sub._id!.toString(), {
      //   currentPeriodStart: nextStart,
      //   currentPeriodEnd:   nextEnd,
      //   dueDate:            nextEnd,
      //   status:             'active',
      //   paidAt:             updated!.paidAt,
      // });

      // let nextPeriodLabel = nextLabel;

      // if (!existingNext) {
      //   const pricing = await this.settingRepo.get();
      //   const nextAmount = computeFullAmount(sub.numberOfBuildings, sub.numberOfUnits, sub.billingCycle, pricing as any);

      //   await this.subscriptionRepo.createPeriod({
      //     subscriptionId: sub._id!,
      //     userId:         sub.userId,
      //     periodStart:    nextStart,
      //     periodEnd:      nextEnd,
      //     periodLabel:    nextLabel,
      //     amount:         nextAmount,
      //     status:         'pending',
      //   });
      // } else {
      //   nextPeriodLabel = existingNext.periodLabel;
      // }

      NotificationModel.create({
        userId: sub.userId,
        title: "Payment Confirmed",
        message: `Your subscription payment for "${updated!.periodLabel}" (₹${updated!.amount}) has been confirmed.`,
        notificationType: "general",
        channel: "in_app",
        type: "payment_confirmed",
        metadata: {
          periodLabel: updated!.periodLabel,
          amount: String(updated!.amount),
        },
      }).catch((err) => logger.error(String(err)));
    }

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.SUBSCRIPTION_PERIOD_PAID,
        entityType: ActivityLogEntityType.SUBSCRIPTION,
        entityId: periodId,
        userId: adminUserId,
        description: `Period "${updated!.periodLabel}" marked paid. Amount: ₹${updated!.amount}.`,
      })
      .catch((err) => logger.error(String(err)));

    return toPeriodResponse(updated!);
  }

  async adminUpdate(
    id: string,
    data: AdminUpdateSubscriptionDTO,
    adminUserId: string,
  ): Promise<SubscriptionResponseDTO> {
    const existing = await this.subscriptionRepo.findById(id);
    if (!existing) throw new NotFoundError("Subscription not found.");
    const updated = await this.subscriptionRepo.update(
      id,
      data as Partial<ISubscription>,
    );

    NotificationModel.create({
      userId: existing.userId,
      title: "Subscription Updated",
      message: `Your subscription has been updated. Buildings: ${data.numberOfBuildings ?? existing.numberOfBuildings}, Units: ${data.numberOfUnits ?? existing.numberOfUnits}.`,
      notificationType: "general",
      channel: "in_app",
      type: "subscription_updated",
    }).catch((err) => logger.error(String(err)));

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.SUBSCRIPTION_UPGRADED,
        entityType: ActivityLogEntityType.SUBSCRIPTION,
        entityId: id,
        userId: adminUserId,
        description: `Subscription updated. Buildings: ${data.numberOfBuildings ?? existing.numberOfBuildings}, Units: ${data.numberOfUnits ?? existing.numberOfUnits}.`,
      })
      .catch((err) => logger.error(String(err)));

    return toResponse(updated!);
  }

  async bookDemo(data: DemoRequestDTO): Promise<{ message: string }> {
    const demo = await DemoRequestModel.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      companyName: data.companyName,
      numberOfBuildings: data.numberOfBuildings,
      numberOfUnits: data.numberOfUnits,
      message: data.message,
    });

    NotificationModel.create({
      recipientRole: "super_admin",
      title: "New Demo Request",
      message: `${data.firstName} ${data.lastName} (${data.email}) requested a demo. Buildings: ${data.numberOfBuildings}, Units: ${data.numberOfUnits}.`,
      notificationType: "general",
      channel: "in_app",
      type: "demo_request",
      metadata: {
        demoRequestId: demo._id.toString(),
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
      },
    }).catch((err) => logger.error(String(err)));

    this.emailService
      .sendNotificationEmail?.(
        process.env.ADMIN_EMAIL ?? "admin@brift.in",
        `New Demo Request from ${data.firstName} ${data.lastName}`,
        `<h2>New Demo Request</h2><p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p><p><strong>Email:</strong> ${data.email}</p><p><strong>Buildings:</strong> ${data.numberOfBuildings}</p><p><strong>Rooms:</strong> ${data.numberOfUnits}</p>`,
      )
      .catch((err) => logger.error(String(err)));

    return {
      message:
        "Demo request received. Our team will contact you within 24 hours.",
    };
  }

  async requestUpgrade(
    data: UpgradeRequestDTO,
    adminEmail: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findById(data.userId);
    const userName = user
      ? `${user.first_name} ${user.last_name}`
      : data.userId;
    const sub = await this.subscriptionRepo.findByUserId(data.userId);

    type UpgradeDoc = { _id: { toString(): string } };
    const upgradeRequest = (await UpgradeRequestModel.create({
      userId: data.userId,
      subscriptionId: sub?._id?.toString() ?? undefined,
      additionalBuildings: data.additionalBuildings ?? 0,
      additionalUnits: data.additionalUnits ?? 0,
      additionalBuildingData: data.additionalBuildingData ?? [],
      message: data.message ?? undefined,
      status: "pending",
    })) as unknown as UpgradeDoc;

    NotificationModel.create({
      recipientRole: "super_admin",
      title: "Upgrade / Renewal Request",
      message: `${userName} has requested an upgrade. +${data.additionalBuildings ?? 0} buildings, +${data.additionalUnits ?? 0} units.`,
      notificationType: "general",
      channel: "in_app",
      type: "upgrade_request",
      metadata: {
        upgradeRequestId: upgradeRequest._id.toString(),
        userId: data.userId,
        builderName: userName,
        builderEmail: user?.email ?? "",
        additionalBuildings: String(data.additionalBuildings ?? 0),
        additionalUnits: String(data.additionalUnits ?? 0),
        message: data.message ?? "",
        subscriptionId: sub?._id?.toString() ?? "",
      },
    }).catch((err) => logger.error(String(err)));

    this.emailService
      .sendNotificationEmail?.(
        adminEmail,
        `Upgrade Request from ${userName}`,
        `<h2>Subscription Upgrade / Renewal Request</h2><p><strong>Builder:</strong> ${userName} (${user?.email})</p><p><strong>Additional Buildings:</strong> ${data.additionalBuildings ?? 0}</p><p><strong>Additional Units:</strong> ${data.additionalUnits ?? 0}</p><p><strong>Message:</strong> ${data.message ?? "None"}</p>`,
      )
      .catch((err) => logger.error(String(err)));

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.UPGRADE_REQUEST_RECEIVED,
        entityType: ActivityLogEntityType.SUBSCRIPTION,
        entityId: upgradeRequest._id.toString(),
        userId: data.userId,
        description: `${userName} requested upgrade: +${data.additionalBuildings ?? 0} buildings, +${data.additionalUnits ?? 0} units.`,
      })
      .catch((err) => logger.error(String(err)));

    return {
      message:
        "Upgrade request submitted. Admin will reach out to confirm and apply changes.",
    };
  }

  async listUpgradeRequests(
    filter: { status?: string; userId?: string },
    page: number,
    limit: number,
  ): Promise<{
    data: IUpgradeRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: Record<string, any> = {};
    if (filter.status) query.status = filter.status;
    if (filter.userId) query.userId = filter.userId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      UpgradeRequestModel.find(query)
        .populate("userId", "first_name last_name email phone_number")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UpgradeRequestModel.countDocuments(query),
    ]);

    const mapped = data.map((d: any) => ({
      ...d,
      _id: d._id.toString(),
      userId: d.userId?._id
        ? { ...d.userId, _id: d.userId._id.toString() }
        : d.userId?.toString(),
      subscriptionId: d.subscriptionId?.toString() ?? undefined,
    }));

    return {
      data: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async resolveUpgradeRequest(
    requestId: string,
    adminUserId: string,
    resolution: {
      status: "approved" | "rejected";
      adminNotes?: string;
      newTotalBuildings: number;
      newTotalUnits: number;
    },
  ): Promise<{
    message: string;
    deltaAmount?: number;
    deltaLabel?: string;
    newFullAmount?: number;
    subscription?: SubscriptionResponseDTO;
    periods?: SubscriptionPeriodResponseDTO[];
  }> {
    const request = (await UpgradeRequestModel.findById(requestId)
      .populate("userId", "first_name last_name email")
      .lean()) as any;

    if (!request) throw new NotFoundError("Upgrade request not found.");
    if (request.status !== "pending") {
      throw new BadRequestError(
        `This request has already been ${request.status}.`,
      );
    }

    const builderUserId =
      request.userId?._id?.toString() ?? request.userId?.toString();
    const builderName = request.userId?.first_name
      ? `${request.userId.first_name} ${request.userId.last_name}`
      : "Builder";
    const builderEmail = request.userId?.email;

    await UpgradeRequestModel.findByIdAndUpdate(requestId, {
      status: resolution.status,
      adminNotes: resolution.adminNotes ?? null,
      resolvedBy: adminUserId,
      resolvedAt: new Date(),
    });

    if (resolution.status === "rejected") {
      NotificationModel.create({
        userId: builderUserId,
        title: "Upgrade Request Rejected",
        message: `Your upgrade request was not approved.${resolution.adminNotes ? ` Reason: ${resolution.adminNotes}` : " Please contact support for more details."}`,
        notificationType: "general",
        channel: "in_app",
        type: "upgrade_request_resolved",
        metadata: {
          requestId,
          status: "rejected",
          adminNotes: resolution.adminNotes ?? "",
        },
      }).catch((err) => logger.error(String(err)));

      this.emailService
        .sendNotificationEmail?.(
          builderEmail,
          "Subscription Upgrade Request Update",
          `<h2>Upgrade Request Update</h2><p>Your upgrade request has not been approved.</p>${resolution.adminNotes ? `<p><strong>Reason:</strong> ${resolution.adminNotes}</p>` : ""}<p>Contact support for help.</p>`,
        )
        .catch((err) => logger.error(String(err)));

      return { message: `Upgrade request rejected for ${builderName}.` };
    }

    if (!request.subscriptionId) {
      throw new BadRequestError(
        "No subscription linked to this upgrade request. Create one manually.",
      );
    }

    const sub = await this.subscriptionRepo.findById(
      request.subscriptionId.toString(),
    );
    if (!sub)
      throw new NotFoundError("Subscription not found for this builder.");

    const pricing = await this.settingRepo.get();
    const pricingConfig = {
      monthlyPricePerBuilding:
        pricing.monthlyPricePerBuilding ?? pricing.pricePerBuilding,
      monthlyPricePerUnit: pricing.monthlyPricePerUnit ?? pricing.pricePerUnit,
      yearlyPricePerBuilding:
        pricing.yearlyPricePerBuilding ?? pricing.pricePerBuilding * 10,
      yearlyPricePerUnit:
        pricing.yearlyPricePerUnit ?? pricing.pricePerUnit * 10,
    };

    const oldBuildings = sub.numberOfBuildings;
    const oldUnits = sub.numberOfUnits;
    const newBuildings = resolution.newTotalBuildings;
    const newUnits = resolution.newTotalUnits;

    const newFullAmount = computeFullAmount(
      newBuildings,
      newUnits,
      sub.billingCycle,
      pricingConfig,
    );

    const updatedSub = await this.subscriptionRepo.update(sub._id!.toString(), {
      numberOfBuildings: newBuildings,
      numberOfUnits: newUnits,
      amount: newFullAmount,
      status: "active",
    });

    const allPeriods = await this.subscriptionRepo.findPeriodsBySubscriptionId(
      sub._id!.toString(),
    );
    const now = new Date();

    const currentPaidPeriod = allPeriods.find(
      (p) =>
        p.status === "paid" &&
        new Date(p.periodStart) <= now &&
        new Date(p.periodEnd) >= now,
    );

    const createdPeriods: ISubscriptionPeriod[] = [];

    const pendingPeriods = allPeriods.filter((p) => p.status === "pending");
    for (const pp of pendingPeriods) {
      const updatedAmount = computeFullAmount(
        newBuildings,
        newUnits,
        sub.billingCycle,
        pricingConfig,
      );
      await this.subscriptionRepo.updatePeriod(pp._id!.toString(), {
        amount: updatedAmount,
      });
    }

    let deltaAmount: number | undefined;
    let deltaLabel: string | undefined;

    if (currentPaidPeriod) {
      const deltaBuildings = newBuildings - oldBuildings;
      const deltaUnits = newUnits - oldUnits;

      if (deltaBuildings > 0 || deltaUnits > 0) {
        const deltaStart = new Date(now);
        deltaStart.setHours(0, 0, 0, 0);
        const periodEndDate = new Date(currentPaidPeriod.periodEnd);

        const existingDelta =
          await this.subscriptionRepo.findOverlappingPendingPeriod(
            sub._id!.toString(),
            deltaStart,
            periodEndDate,
          );

        if (!existingDelta) {
          deltaAmount = computeProRatedAmount(
            deltaBuildings,
            deltaUnits,
            sub.billingCycle,
            pricingConfig,
            deltaStart,
            periodEndDate,
          );

          const deltaEndLabel = periodEndDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const deltaStartLabel = deltaStart.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          deltaLabel = `Top-up: ${deltaStartLabel} – ${deltaEndLabel}`;

          const deltaPeriod = await this.subscriptionRepo.createPeriod({
            subscriptionId: sub._id!,
            userId: sub.userId,
            periodStart: deltaStart,
            periodEnd: periodEndDate,
            periodLabel: deltaLabel,
            amount: deltaAmount,
            status: "pending",
          });
          createdPeriods.push(deltaPeriod);
        }
      }
    } else {
      const freshStart = new Date(now);
      freshStart.setHours(0, 0, 0, 0);
      const { end: freshEnd, label: freshLabel } = buildPeriodDates(
        freshStart,
        sub.billingCycle,
      );

      const existingFresh =
        await this.subscriptionRepo.findOverlappingPendingPeriod(
          sub._id!.toString(),
          freshStart,
          freshEnd,
        );

      if (!existingFresh) {
        const freshPeriod = await this.subscriptionRepo.createPeriod({
          subscriptionId: sub._id!,
          userId: sub.userId,
          periodStart: freshStart,
          periodEnd: freshEnd,
          periodLabel: freshLabel,
          amount: newFullAmount,
          status: "pending",
        });
        createdPeriods.push(freshPeriod);
      }
    }

    const upgradeNote =
      deltaAmount != null
        ? `A top-up charge of ₹${deltaAmount} has been created for the remainder of your current billing period. Your next full period will be ₹${newFullAmount}.`
        : `Your next billing period will be ₹${newFullAmount}.`;

    NotificationModel.create({
      userId: builderUserId,
      title: "Subscription Upgraded",
      message: `Your subscription has been upgraded to ${newBuildings} buildings and ${newUnits} units. ${upgradeNote}${resolution.adminNotes ? ` Note: ${resolution.adminNotes}` : ""}`,
      notificationType: "general",
      channel: "in_app",
      type: "upgrade_request_resolved",
      metadata: {
        requestId,
        status: "approved",
        newBuildings: String(newBuildings),
        newUnits: String(newUnits),
        newFullAmount: String(newFullAmount),
        deltaAmount: String(deltaAmount ?? 0),
        deltaLabel: deltaLabel ?? "",
        adminNotes: resolution.adminNotes ?? "",
      },
    }).catch((err) => logger.error(String(err)));

    this.emailService
      .sendNotificationEmail?.(
        builderEmail,
        "Subscription Upgrade Approved",
        `<h2>Subscription Upgraded</h2><p>Your subscription has been upgraded to <strong>${newBuildings} buildings</strong> and <strong>${newUnits} units</strong>.</p><p>${upgradeNote}</p>${resolution.adminNotes ? `<p><strong>Note:</strong> ${resolution.adminNotes}</p>` : ""}<p>Please log in to your billing page to review your updated periods.</p>`,
      )
      .catch((err) => logger.error(String(err)));

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.SUBSCRIPTION_UPGRADED,
        entityType: ActivityLogEntityType.SUBSCRIPTION,
        entityId: sub._id!.toString(),
        userId: adminUserId,
        description: `Subscription for ${builderName} upgraded: ${oldBuildings}→${newBuildings} buildings, ${oldUnits}→${newUnits} units. New amount: ₹${newFullAmount}. Delta period: ₹${deltaAmount ?? 0}.`,
        metadata: {
          oldBuildings,
          newBuildings,
          oldUnits,
          newUnits,
          newFullAmount,
          deltaAmount,
          deltaLabel,
        },
      })
      .catch((err) => logger.error(String(err)));

    const allUpdatedPeriods =
      await this.subscriptionRepo.findPeriodsBySubscriptionId(
        sub._id!.toString(),
      );

    return {
      message: `Upgrade approved for ${builderName}. New totals: ${newBuildings} buildings, ${newUnits} units.${deltaAmount ? ` Delta top-up period of ₹${deltaAmount} created.` : ""}`,
      deltaAmount,
      deltaLabel,
      newFullAmount,
      subscription: toResponse(updatedSub!),
      periods: allUpdatedPeriods.map(toPeriodResponse),
    };
  }

  async previewUpgradeForRequest(
    requestId: string,
    newTotalBuildings: number,
    newTotalUnits: number,
  ): Promise<{
    newFullAmount: number;
    deltaAmount?: number;
    deltaLabel?: string;
  }> {
    const request = await UpgradeRequestModel.findById(requestId).lean();
    if (!request) throw new NotFoundError("Upgrade request not found.");
    return this.previewUpgrade(
      request.userId.toString(),
      newTotalBuildings,
      newTotalUnits,
    );
  }

  /**
   * Pure preview of what approving an upgrade would cost, without mutating anything.
   * Mirrors the calculation used inside resolveUpgradeRequest so the admin UI and the
   * actual approval always agree on the numbers — this is the single source of truth
   * for upgrade pricing math; do not duplicate this calculation elsewhere.
   */
  async previewUpgrade(
    builderUserId: string,
    newTotalBuildings: number,
    newTotalUnits: number,
  ): Promise<{
    newFullAmount: number;
    deltaAmount?: number;
    deltaLabel?: string;
  }> {
    const sub = await this.subscriptionRepo.findByUserId(builderUserId);
    if (!sub)
      throw new NotFoundError("No subscription found for this builder.");

    const pricing = await this.settingRepo.get();
    const pricingConfig = {
      monthlyPricePerBuilding:
        pricing.monthlyPricePerBuilding ?? pricing.pricePerBuilding,
      monthlyPricePerUnit: pricing.monthlyPricePerUnit ?? pricing.pricePerUnit,
      yearlyPricePerBuilding:
        pricing.yearlyPricePerBuilding ?? pricing.pricePerBuilding * 10,
      yearlyPricePerUnit:
        pricing.yearlyPricePerUnit ?? pricing.pricePerUnit * 10,
    };

    const newFullAmount = computeFullAmount(
      newTotalBuildings,
      newTotalUnits,
      sub.billingCycle,
      pricingConfig,
    );

    const deltaBuildings = Math.max(
      0,
      newTotalBuildings - sub.numberOfBuildings,
    );
    const deltaUnits = Math.max(0, newTotalUnits - sub.numberOfUnits);

    if (deltaBuildings === 0 && deltaUnits === 0) {
      return { newFullAmount };
    }

    const allPeriods = await this.subscriptionRepo.findPeriodsBySubscriptionId(
      sub._id!.toString(),
    );
    const now = new Date();
    const activePeriod = allPeriods.find(
      (p) =>
        p.status === "paid" &&
        new Date(p.periodStart) <= now &&
        new Date(p.periodEnd) >= now,
    );

    if (!activePeriod) {
      return { newFullAmount };
    }

    const periodEnd = new Date(activePeriod.periodEnd);
    const deltaAmount = computeProRatedAmount(
      deltaBuildings,
      deltaUnits,
      sub.billingCycle,
      pricingConfig,
      now,
      periodEnd,
    );

    const deltaEndLabel = periodEnd.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const deltaStartLabel = now.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const deltaLabel = `Top-up: ${deltaStartLabel} – ${deltaEndLabel}`;

    return { newFullAmount, deltaAmount, deltaLabel };
  }

  async listDemoRequests(
    filter: { status?: string },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const query: Record<string, any> = {};
    if (filter.status) query.status = filter.status;
    const [data, total] = await Promise.all([
      DemoRequestModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DemoRequestModel.countDocuments(query),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateDemoRequest(
    id: string,
    body: { status?: string; adminNotes?: string },
  ) {
    const doc = await DemoRequestModel.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true },
    ).lean();
    if (!doc) throw new NotFoundError("Demo request not found.");
    return doc;
  }
}
