import { logger } from "../../../shared/logger/logger";
import { ITenant } from "../../../domain/entities/Tenant";
import { ITenantRepository } from "../../../domain/repository/tenant-repository-impl";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../../shared/error/app-error";
import {
  CreateTenantDTO,
  TenantResponseDTO,
  UpdateTenantDTO,
} from "../../dtos/tenant/tenant.dto";
import { ITenantUseCases } from "../../interface/tenant/tenant-usecase-impl";
import { IUnitRepository } from "../../../domain/repository/unit-repository-impl";
import { IActivityLogUsecase } from "../../usecase/activity-log/activity-log-usecase";
import {
  ActivityLogAction,
  ActivityLogEntityType,
} from "../../../domain/entities/ActivityLog";
import { ITenantPortalTokenService } from "../../interface/common/tenant-portal-token-service.interface";
import { IEmailService } from "../../interface/common/email-service-usecase.impl";
import { IReservedTenantRepository } from "../../../domain/repository/reserved-tenant-repository-impl";
import { env } from "../../../infrastructure/config/env";

function toResponse(t: ITenant): TenantResponseDTO {
  return {
    _id: t._id!,
    firstName: t.firstName,
    lastName: t.lastName,
    fullName: `${t.firstName} ${t.lastName}`,
    email: t.email,
    phone: t.phone,
    status: t.status,
    unitId: t.unitId,
    buildingId: t.buildingId,
    createdBy: t.createdBy,
    job: t.job,
    notes: t.notes,
    emergencyContact: t.emergencyContact,
    rentType: t.rentType,
    rentAmount: t.rentAmount,
    dueDate: t.dueDate,
    moveInDate: t.moveInDate,
    vacateDate: t.vacateDate,
    paidAt: t.paidAt,
    terms: t.terms,
    portalEnabled: t.portalEnabled,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export class TenantUseCases implements ITenantUseCases {
  constructor(
    private readonly tenantRepository: ITenantRepository,
    private readonly unitRepo: IUnitRepository,
    private readonly activityLogUc: IActivityLogUsecase,
    private readonly tenantPortalTokenService: ITenantPortalTokenService,
    private readonly emailService: IEmailService,
    private readonly reservedTenantRepo: IReservedTenantRepository,
  ) {}

  async create(data: CreateTenantDTO): Promise<TenantResponseDTO> {
    if (data.dueDate < 1 || data.dueDate > 31) {
      throw new BadRequestError(
        "dueDate must be between 1 and 31.",
        "Enter a valid day of the month for rent due date.",
      );
    }
    if (data.rentAmount < 0) {
      throw new BadRequestError(
        "rentAmount must be a positive number.",
        "Enter a valid rent amount.",
      );
    }

    if (data.agreementStartDate && data.agreementEndDate) {
      const start = new Date(data.agreementStartDate);
      const end = new Date(data.agreementEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestError(
          "Invalid agreement dates provided.",
          "Enter valid start and end dates for the agreement.",
        );
      }
      if (end <= start) {
        throw new BadRequestError(
          "Agreement end date must be after the start date.",
          "Please set the end date to a date after the start date.",
        );
      }
    }

    if (data.unitId) {
      const unit = await this.unitRepo.findById(data.unitId);
      if (!unit) {
        throw new NotFoundError(
          "Room not found.",
          "The selected room does not exist.",
        );
      }
      if (unit.isOccupied || unit.status === "occupied") {
        throw new BadRequestError(
          "This room is already occupied.",
          "Please select a different room or vacate the current tenant first.",
        );
      }
    }

    const tenant = await this.tenantRepository.create({
      ...data,
      status: "pending",
      portalEnabled: false,
    });

    if (tenant.unitId) {
      await this.unitRepo.update(tenant.unitId, {
        isOccupied: true,
        status: "occupied",
      });
      await this.reservedTenantRepo.deleteByUnitId(tenant.unitId);
    }

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.TENANT_CREATED,
        entityType: ActivityLogEntityType.TENANT,
        entityId: tenant._id,
        buildingId: tenant.buildingId,
        unitId: tenant.unitId,
        userId: data.createdBy ?? (tenant.userId as any),
        description: `Tenant ${tenant.firstName} ${tenant.lastName} created${tenant.unitId ? " and assigned to unit" : ""}. Rent: ₹${tenant.rentAmount}/${tenant.rentType}.`,
        metadata: {
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          rentAmount: tenant.rentAmount,
          rentType: tenant.rentType,
        },
      })
      .catch((err) => logger.error(String(err)));
    console.log("Activity log created for tenant creation:", tenant._id);
    return toResponse(tenant);
  }

  async getAll(filter?: {
    buildingId?: string;
    unitId?: string;
    status?: string;
    ownerId?: string;
  }): Promise<TenantResponseDTO[]> {
    const repoFilter: Record<string, any> = {};
    if (filter?.buildingId) repoFilter.buildingId = filter.buildingId;
    if (filter?.unitId) repoFilter.unitId = filter.unitId;
    if (filter?.status) repoFilter.status = filter.status;
    if (filter?.ownerId) repoFilter.createdBy = filter.ownerId;

    const tenants = await this.tenantRepository.findAll(repoFilter);
    return tenants.map(toResponse);
  }

  async getById(id: string, ownerId?: string): Promise<TenantResponseDTO> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant)
      throw new NotFoundError(
        "Tenant not found.",
        "Check the tenant ID and try again.",
      );
    if (ownerId && tenant.createdBy && tenant.createdBy !== ownerId) {
      throw new ForbiddenError(
        "You do not have access to this tenant.",
        "This tenant belongs to a different builder.",
      );
    }
    return toResponse(tenant);
  }

  async update(
    id: string,
    data: UpdateTenantDTO,
    ownerId?: string,
  ): Promise<TenantResponseDTO> {
    const existing = await this.tenantRepository.findById(id);
    if (!existing)
      throw new NotFoundError(
        "Tenant not found.",
        "Check the tenant ID and try again.",
      );
    if (ownerId && existing.createdBy && existing.createdBy !== ownerId) {
      throw new ForbiddenError(
        "You do not have access to this tenant.",
        "This tenant belongs to a different builder.",
      );
    }

    if (data.unitId && data.unitId !== existing.unitId) {
      if (existing.unitId)
        await this.unitRepo.update(existing.unitId, {
          isOccupied: false,
          status: "available",
        });
      await this.unitRepo.update(data.unitId, {
        isOccupied: true,
        status: "occupied",
      });
    } else if (data.status === "inactive" || data.status === "blacklisted") {
      if (existing.unitId)
        await this.unitRepo.update(existing.unitId, {
          isOccupied: false,
          status: "available",
        });
    }

    const updated = await this.tenantRepository.update(id, data as any);

    if (data.status && data.status !== existing.status) {
      this.activityLogUc
        .logActivity({
          action: ActivityLogAction.TENANT_STATUS_CHANGED,
          entityType: ActivityLogEntityType.TENANT,
          entityId: updated!._id,
          buildingId: updated!.buildingId,
          unitId: updated!.unitId,
          userId: ownerId ?? (updated!.userId as any),
          description: `Tenant ${updated!.firstName} ${updated!.lastName} status changed from ${existing.status} to ${data.status}.`,
          metadata: { oldStatus: existing.status, newStatus: data.status },
        })
        .catch((err) => logger.error(String(err)));
    } else {
      this.activityLogUc
        .logActivity({
          action: ActivityLogAction.TENANT_UPDATED,
          entityType: ActivityLogEntityType.TENANT,
          entityId: updated!._id,
          buildingId: updated!.buildingId,
          unitId: updated!.unitId,
          userId: ownerId ?? (updated!.userId as any),
          description: `Tenant ${updated!.firstName} ${updated!.lastName} profile updated.`,
        })
        .catch((err) => logger.error(String(err)));
    }

    return toResponse(updated!);
  }

  async delete(id: string, ownerId?: string): Promise<void> {
    const existing = await this.tenantRepository.findById(id);
    if (!existing)
      throw new NotFoundError(
        "Tenant not found.",
        "Check the tenant ID and try again.",
      );
    if (ownerId && existing.createdBy && existing.createdBy !== ownerId) {
      throw new ForbiddenError(
        "You do not have access to this tenant.",
        "This tenant belongs to a different builder.",
      );
    }

    if (existing.unitId) {
      await this.unitRepo.update(existing.unitId, {
        isOccupied: false,
        status: "available",
      });
    }

    await this.tenantRepository.delete(id);

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.TENANT_DELETED,
        entityType: ActivityLogEntityType.TENANT,
        entityId: existing._id,
        buildingId: existing.buildingId,
        unitId: existing.unitId,
        userId: ownerId ?? (existing.userId as any),
        description: `Tenant ${existing.firstName} ${existing.lastName} was deleted.`,
      })
      .catch((err) => logger.error(String(err)));
  }

  async getTenantLeases(tenantId: string): Promise<any[]> {
    const exists = await this.tenantRepository.existsById(tenantId);
    if (!exists) {
      throw new NotFoundError(
        "Tenant not found.",
        "Check the tenant ID and try again.",
      );
    }
    return [];
  }

  async transferTenant(
    tenantId: string,
    targetUnitId: string,
    adminUserId: string,
    ownerId?: string,
  ): Promise<{ tenant: TenantResponseDTO; message: string }> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundError("Tenant not found.");
    if (ownerId && tenant.createdBy && tenant.createdBy !== ownerId) {
      throw new ForbiddenError(
        "You do not have access to this tenant.",
        "This tenant belongs to a different builder.",
      );
    }

    const targetUnit = await this.unitRepo.findById(targetUnitId);
    if (!targetUnit) throw new NotFoundError("Target room not found.");

    if (targetUnit.status === "under maintenance") {
      throw new BadRequestError(
        "Cannot transfer tenant to a room under maintenance.",
        "Choose an available or occupied room.",
      );
    }

    const sourceUnitId = tenant.unitId;
    let displacedTenantInfo: string | null = null;

    if (targetUnit.status === "occupied" || targetUnit.isOccupied) {
      const tenantsInTarget = await this.tenantRepository.findAll({
        unitId: targetUnitId,
      });
      const targetTenant = tenantsInTarget.find((t) => t._id !== tenantId);

      if (targetTenant) {
        await this.tenantRepository.update(targetTenant._id!, {
          unitId: sourceUnitId ?? undefined,
          buildingId: sourceUnitId ? tenant.buildingId : undefined,
        } as any);

        if (sourceUnitId) {
          await this.unitRepo.update(sourceUnitId, {
            isOccupied: true,
            status: "occupied",
          });
        }

        displacedTenantInfo = `${targetTenant.firstName} ${targetTenant.lastName} moved to ${sourceUnitId ? `room ${sourceUnitId}` : "no room"}`;
      }
    } else {
      if (sourceUnitId) {
        await this.unitRepo.update(sourceUnitId, {
          isOccupied: false,
          status: "available",
        });
      }
    }

    const updatedTenant = await this.tenantRepository.update(tenantId, {
      unitId: targetUnitId,
      buildingId: targetUnit.buildingId,
    } as any);

    await this.unitRepo.update(targetUnitId, {
      isOccupied: true,
      status: "occupied",
    });

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.TENANT_TRANSFERRED,
        entityType: ActivityLogEntityType.TENANT,
        entityId: tenantId,
        buildingId: targetUnit.buildingId,
        unitId: targetUnitId,
        userId: adminUserId,
        description: `Tenant ${tenant.firstName} ${tenant.lastName} transferred from unit ${sourceUnitId ?? "none"} to unit ${targetUnit.unitNumber}.${displacedTenantInfo ? ` ${displacedTenantInfo}.` : ""}`,
        metadata: {
          fromUnitId: sourceUnitId,
          toUnitId: targetUnitId,
          displacedTenantInfo,
        },
      })
      .catch((err) => logger.error(String(err)));

    const message = displacedTenantInfo
      ? `Tenant transferred. ${displacedTenantInfo}.`
      : `Tenant transferred to room ${targetUnit.unitNumber}. Previous room is now available.`;

    return { tenant: toResponse(updatedTenant!), message };
  }

  async setPortalAccess(
    id: string,
    enabled: boolean,
    ownerId?: string,
  ): Promise<TenantResponseDTO> {
    const existing = await this.tenantRepository.findById(id);
    if (!existing)
      throw new NotFoundError(
        "Tenant not found.",
        "Check the tenant ID and try again.",
      );
    if (ownerId && existing.createdBy && existing.createdBy !== ownerId) {
      throw new ForbiddenError(
        "You do not have access to this tenant.",
        "This tenant belongs to a different builder.",
      );
    }

    const updateData: Partial<ITenant> = { portalEnabled: enabled };
    if (enabled && !existing.portalActivatedAt) {
      updateData.portalActivatedAt = new Date();
    }

    const updated = await this.tenantRepository.update(id, updateData);

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.TENANT_UPDATED,
        entityType: ActivityLogEntityType.TENANT,
        entityId: id,
        buildingId: existing.buildingId,
        unitId: existing.unitId,
        userId: ownerId ?? (existing.userId as any),
        description: `Tenant portal access ${enabled ? "enabled" : "disabled"} for ${existing.firstName} ${existing.lastName}.`,
      })
      .catch((err) => logger.error(String(err)));

    if (enabled && !existing.passwordSetAt && this.emailService.sendNotificationEmail) {
      const setupToken = this.tenantPortalTokenService.generateSetupToken(id);
      const setupLink = `${env.FRONTEND_URL}/tenant-portal/set-password?token=${setupToken}`;
      this.emailService
        .sendNotificationEmail(
          existing.email,
          "Your tenant portal is ready",
          `Hi ${existing.firstName}, your property manager has enabled your tenant portal. Set up your password to get started: ${setupLink} (this link expires in ${env.TENANT_PORTAL_SETUP_EXPIRES_IN}).`,
        )
        .catch((err) =>
          logger.error("Failed to email tenant portal setup link:", err),
        );
    } else if (enabled && existing.passwordSetAt && this.emailService.sendNotificationEmail) {
      this.emailService
        .sendNotificationEmail(
          existing.email,
          "Tenant portal access restored",
          `Hi ${existing.firstName}, your tenant portal access has been restored. Log in with your existing credentials.`,
        )
        .catch((err) => logger.error("Failed to email tenant:", err));
    } else if (!enabled && this.emailService.sendNotificationEmail) {
      this.emailService
        .sendNotificationEmail(
          existing.email,
          "Tenant portal access removed",
          `Hi ${existing.firstName}, your property manager has disabled tenant portal access for now.`,
        )
        .catch((err) => logger.error("Failed to email tenant:", err));
    }

    return toResponse(updated!);
  }
}
