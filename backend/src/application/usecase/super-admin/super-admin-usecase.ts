import { logger } from "../../../shared/logger/logger";
import { IUserRepository } from "../../../domain/repository/user-repository.interface";
import { IBuildingRepository } from "../../../domain/repository/building-repository.interface";
import { ISubscriptionRepository } from "../../../domain/repository/subscription-repository.interface";
import { IUnitRepository } from "../../../domain/repository/unit-repository.interface";
import { IInquiryRepository } from "../../../domain/repository/inquiry-repository.interface";
import { IPlatformSettingRepository } from "../../../domain/repository/platform-setting-repository.interface";
import { IActivityLogUsecase } from "../activity-log/activity-log-usecase";
import { ISuperAdminUseCases } from "../../interface/super-admin/super-admin-usecase.interface";
import {
  BuilderDetailDTO,
  BuilderListItemDTO,
  PlatformStatsDTO,
} from "../../dtos/super-admin/super-admin.dto";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/error/app-error";
import { IPlatformSetting } from "../../../domain/entities/PlatformSetting";
import { BuildingResponseDTO } from "../../dtos/building/building.dto";
import {
  AdminUpdateSubscriptionDTO,
  SubscriptionResponseDTO,
} from "../../dtos/subscription/subscription.dto";
import {
  ISubscription,
  BillingCycle,
} from "../../../domain/entities/Subscription";
import {
  ActivityLogAction,
  ActivityLogEntityType,
} from "../../../domain/entities/ActivityLog";
import { IEmailService } from "../../interface/common/email-service-usecase.interface";
import bcrypt from "bcrypt";

function toSubscriptionResponse(s: ISubscription): SubscriptionResponseDTO {
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

export class SuperAdminUseCases implements ISuperAdminUseCases {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly buildingRepo: IBuildingRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly unitRepo: IUnitRepository,
    private readonly inquiryRepo: IInquiryRepository,
    private readonly settingRepo: IPlatformSettingRepository,
    private readonly activityLogUc: IActivityLogUsecase,
    private readonly emailService: IEmailService,
  ) {}

  async getPlatformStats(): Promise<PlatformStatsDTO> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalBuilders,
      totalManagers,
      totalBuildings,
      publishedBuildings,
      allBuildings,
      activeSubscriptions,
      pendingSubscriptions,
      totalInquiries,
      recentInquiries,
      adminRevenue,
    ] = await Promise.all([
      this.userRepo.countAll({ role: "admin" }),
      this.userRepo.countAll({ role: "manager" }),
      this.buildingRepo.countAll(),
      this.buildingRepo.countAll({ isPublished: true }),
      this.buildingRepo.findAll(),
      this.subscriptionRepo.countAll({ status: "active" }),
      this.subscriptionRepo.countAll({ status: "pending" }),
      this.inquiryRepo.countAll(),
      this.inquiryRepo.findAllPaginated({}, 0, 100000),
      this.subscriptionRepo.getAdminRevenue(),
    ]);

    const recentBuildersList = await this.userRepo.findAllPaginated(
      { role: "admin" },
      0,
      100000,
    );
    const newBuildersLast30Days = recentBuildersList.data.filter(
      (u) => u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo,
    ).length;
    const newInquiriesLast30Days = recentInquiries.data.filter(
      (i) => i.createdAt && new Date(i.createdAt) >= thirtyDaysAgo,
    ).length;

    const totalRooms = allBuildings.reduce((sum, b) => sum + b.totalUnits, 0);
    const occupiedCounts = await Promise.all(
      allBuildings.map((b) =>
        this.unitRepo.countByBuildingId(b._id!, { isOccupied: true }),
      ),
    );
    const occupiedRooms = occupiedCounts.reduce((s, c) => s + c, 0);
    const vacantRooms = Math.max(0, totalRooms - occupiedRooms);
    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 1000) / 10 : 0;

    return {
      totalBuilders,
      totalManagers,
      totalBuildings,
      publishedBuildings,
      totalRooms,
      occupiedRooms,
      vacantRooms,
      occupancyRate,
      totalRevenue: adminRevenue,
      activeSubscriptions,
      pendingSubscriptions,
      newBuildersLast30Days,
      totalInquiries,
      newInquiriesLast30Days,
    };
  }

  /** Manually register a new builder account and set up their subscription */
  async registerBuilder(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      billingCycle: BillingCycle;
      numberOfBuildings: number;
      numberOfUnits: number;
      amount: number;
      notes?: string;
    },
    adminUserId: string,
  ): Promise<{
    userId: string;
    message: string;
    emailSent: boolean;
    tempPassword?: string;
  }> {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing)
      throw new BadRequestError(
        "A user with this email already exists.",
        "Use a different email address.",
      );

    const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await this.userRepo.create({
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone_number: data.phone ?? null,
      password: hashedPassword,
      role: "admin",
      status: "active",
      email_verified: true,
      paymentStatus: true,
    } as any);

    // Create subscription
    const periodStart = new Date();
    const { end: periodEnd, label: periodLabel } = buildPeriodDates(
      periodStart,
      data.billingCycle,
    );

    const sub = await this.subscriptionRepo.create({
      userId: user._id!,
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

    // Create first period (pending payment)
    await this.subscriptionRepo.createPeriod({
      subscriptionId: sub._id!,
      userId: user._id!,
      periodStart,
      periodEnd,
      periodLabel,
      amount: data.amount,
      status: "pending",
    });

    // Send welcome email with credentials
    let emailSent = true;
    try {
      if (this.emailService.sendBuilderWelcomeCredentials) {
        await this.emailService.sendBuilderWelcomeCredentials(
          data.email,
          `${data.firstName} ${data.lastName}`,
          tempPassword,
        );
      } else {
        await this.emailService.sendWelcomeCredentials(
          data.email,
          `${data.firstName} ${data.lastName}`,
          tempPassword,
        );
      }
    } catch (e) {
      emailSent = false;
      logger.error("Welcome email failed:", e);
    }

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BUILDER_REGISTERED,
        entityType: ActivityLogEntityType.USER,
        entityId: user._id!,
        userId: adminUserId,
        description: `Builder ${data.firstName} ${data.lastName} (${data.email}) registered manually. Cycle: ${data.billingCycle}, Buildings: ${data.numberOfBuildings}, Units: ${data.numberOfUnits}.${
          emailSent ? "" : " Welcome email delivery FAILED."
        }`,
        metadata: {
          email: data.email,
          billingCycle: data.billingCycle,
          numberOfBuildings: data.numberOfBuildings,
          numberOfUnits: data.numberOfUnits,
          emailSent,
        },
      })
      .catch((err) => logger.error(String(err)));

    return {
      userId: user._id!,
      message: emailSent
        ? `Builder registered. Welcome email with login credentials sent to ${data.email}.`
        : `Builder registered, but the welcome email could not be delivered to ${data.email}. Share the temporary password below with them securely.`,
      emailSent,
      ...(emailSent ? {} : { tempPassword }),
    };
  }

  async listBuilders(
    filter: { search?: string; status?: string; role?: string },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const { data, total } = await this.userRepo.findAllPaginated(
      {
        search: filter.search,
        status: filter.status as any,
        role: (filter.role as any) || "admin",
      },
      skip,
      limit,
    );

    const enriched: BuilderListItemDTO[] = await Promise.all(
      data.map(async (u) => {
        const buildings = await this.buildingRepo.findByOwnerId(u._id!);
        return {
          _id: u._id!,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          phone_number: u.phone_number,
          status: u.status,
          role: u.role,
          paymentStatus: u.paymentStatus,
          email_verified: u.email_verified,
          buildingsCount: buildings.length,
          unitsCount: buildings.reduce((s, b) => s + b.totalUnits, 0),
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
        };
      }),
    );

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getBuilderDetail(id: string): Promise<BuilderDetailDTO> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError("Builder not found.");

    const [buildings, managers, subscription] = await Promise.all([
      this.buildingRepo.findByOwnerId(id),
      this.userRepo.findByOwnerId(id),
      this.subscriptionRepo.findByUserId(id),
    ]);

    const periods = subscription
      ? await this.subscriptionRepo.findPeriodsBySubscriptionId(
          subscription._id!.toString(),
        )
      : [];

    return {
      _id: user._id!,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      status: user.status,
      role: user.role,
      paymentStatus: user.paymentStatus,
      email_verified: user.email_verified,
      buildingsCount: buildings.length,
      unitsCount: buildings.reduce((s, b) => s + b.totalUnits, 0),
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      managers: managers.map((m) => ({
        _id: m._id!,
        first_name: m.first_name,
        last_name: m.last_name,
        email: m.email,
        status: m.status,
      })),
      buildings: buildings.map((b) => ({
        _id: b._id!,
        name: b.name,
        totalUnits: b.totalUnits,
        totalFloors: b.totalFloors,
        status: b.status,
        isPublished: b.isPublished,
      })),
      subscription: subscription
        ? {
            _id: subscription._id!.toString(),
            amount: subscription.amount,
            numberOfBuildings: subscription.numberOfBuildings,
            numberOfUnits: subscription.numberOfUnits,
            status: subscription.status,
            billingCycle: subscription.billingCycle,
            dueDate: subscription.dueDate,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            periods: periods.map((p) => ({
              _id: p._id!.toString(),
              periodLabel: p.periodLabel,
              periodStart: p.periodStart,
              periodEnd: p.periodEnd,
              amount: p.amount,
              status: p.status,
              paidAt: p.paidAt,
            })),
          }
        : null,
    } as any;
  }

  async updateBuilderStatus(
    id: string,
    status: "active" | "inactive" | "suspended",
  ): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError("Builder not found.");
    if (user.role === "super_admin")
      throw new BadRequestError("Cannot modify another super admin from here.");
    await this.userRepo.updateStatus(id, status);

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BUILDER_STATUS_CHANGED,
        entityType: ActivityLogEntityType.USER,
        entityId: id,
        userId: id,
        description: `Builder ${user.first_name} ${user.last_name} status changed to ${status}.`,
        metadata: { newStatus: status },
      })
      .catch((err) => logger.error(String(err)));
  }

  async deleteBuilder(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError("Builder not found.");
    if (user.role === "super_admin")
      throw new BadRequestError("Cannot delete a super admin account.");

    const buildings = await this.buildingRepo.findByOwnerId(id);
    const hasOccupied = (
      await Promise.all(
        buildings.map((b) =>
          this.unitRepo.countByBuildingId(b._id!, { isOccupied: true }),
        ),
      )
    ).some((c) => c > 0);
    if (hasOccupied) {
      throw new BadRequestError(
        "This builder still has occupied rooms.",
        "All tenants must be vacated before deleting this account.",
      );
    }

    for (const b of buildings) {
      const units = await this.unitRepo.findByBuildingId(b._id!);
      await Promise.all(units.map((u) => this.unitRepo.delete(u._id!)));
      await this.buildingRepo.delete(b._id!);
    }
    const managers = await this.userRepo.findByOwnerId(id);
    await Promise.all(managers.map((m) => this.userRepo.delete(m._id!)));
    await this.userRepo.delete(id);

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BUILDER_DELETED,
        entityType: ActivityLogEntityType.USER,
        entityId: id,
        userId: id,
        description: `Builder ${user.first_name} ${user.last_name} (${user.email}) account and all associated data deleted.`,
      })
      .catch((err) => logger.error(String(err)));
  }

  async listBuildings(
    filter: {
      search?: string;
      status?: string;
      isPublished?: boolean;
      isFeatured?: boolean;
    },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const { data, total } = await this.buildingRepo.findAllPaginated(
      filter as any,
      skip,
      limit,
    );

    const ownerCache = new Map<string, string>();
    const enriched = await Promise.all(
      data.map(async (b) => {
        let ownerName = ownerCache.get(b.ownerId);
        if (!ownerName) {
          const owner = await this.userRepo.findById(b.ownerId);
          ownerName = owner
            ? `${owner.first_name} ${owner.last_name}`
            : "Unknown";
          ownerCache.set(b.ownerId, ownerName);
        }
        return { ...(b as unknown as BuildingResponseDTO), ownerName };
      }),
    );

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async toggleFeatureBuilding(
    id: string,
    isFeatured: boolean,
  ): Promise<BuildingResponseDTO> {
    const settings = await this.settingRepo.get();
    if (isFeatured) {
      const currentlyFeatured = await this.buildingRepo.countAll({
        isFeatured: true,
      });
      if (currentlyFeatured >= settings.maxFeaturedBuildings) {
        throw new BadRequestError(
          `You can feature at most ${settings.maxFeaturedBuildings} buildings at once.`,
          "Un-feature another listing first.",
        );
      }
    }
    const updated = await this.buildingRepo.update(id, { isFeatured });
    if (!updated) throw new NotFoundError("Building not found.");
    return updated as unknown as BuildingResponseDTO;
  }

  async togglePublishBuilding(
    id: string,
    isPublished: boolean,
  ): Promise<BuildingResponseDTO> {
    const updated = await this.buildingRepo.update(id, { isPublished });
    if (!updated) throw new NotFoundError("Building not found.");
    return updated as unknown as BuildingResponseDTO;
  }

  async deleteBuildingAsAdmin(id: string): Promise<void> {
    const occupied = await this.unitRepo.countByBuildingId(id, {
      isOccupied: true,
    });
    if (occupied > 0)
      throw new BadRequestError(
        `This building has ${occupied} occupied room(s).`,
        "Vacate every tenant first.",
      );
    const units = await this.unitRepo.findByBuildingId(id);
    await Promise.all(units.map((u) => this.unitRepo.delete(u._id!)));
    await this.buildingRepo.delete(id);
  }

  async listActivityLogs(
    filter: Record<string, any>,
    page: number,
    limit: number,
  ) {
    const result = await this.activityLogUc.getActivitiesPaginated(
      filter,
      page,
      limit,
    );
    return {
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit) || 1,
    };
  }

  async getSettings(): Promise<IPlatformSetting> {
    return this.settingRepo.get();
  }

  async updateSettings(
    data: Partial<IPlatformSetting>,
    updatedBy: string,
  ): Promise<IPlatformSetting> {
    return this.settingRepo.update(data, updatedBy);
  }

  async listSubscriptions(
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

    const ownerCache = new Map<string, string>();
    const enriched = await Promise.all(
      data.map(async (s) => {
        const userId = s.userId.toString();
        let ownerName = ownerCache.get(userId);
        if (!ownerName) {
          const owner = await this.userRepo.findById(userId);
          ownerName = owner
            ? `${owner.first_name} ${owner.last_name} (${owner.email})`
            : "Unknown";
          ownerCache.set(userId, ownerName);
        }
        const periods = await this.subscriptionRepo.findPeriodsBySubscriptionId(
          s._id!.toString(),
        );
        return { ...toSubscriptionResponse(s), ownerName, periods };
      }),
    );

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateSubscription(
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

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.SUBSCRIPTION_UPGRADED,
        entityType: ActivityLogEntityType.SUBSCRIPTION,
        entityId: id,
        userId: adminUserId,
        description: `Subscription ${id} updated by admin. Buildings: ${data.numberOfBuildings ?? existing.numberOfBuildings}, Units: ${data.numberOfUnits ?? existing.numberOfUnits}.`,
      })
      .catch((err) => logger.error(String(err)));

    return toSubscriptionResponse(updated!);
  }
}
