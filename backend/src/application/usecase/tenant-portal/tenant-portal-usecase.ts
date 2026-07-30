import bcrypt from "bcryptjs";
import { ITenant } from "../../../domain/entities/Tenant";
import { ITenantRepository } from "../../../domain/repository/tenant-repository.interface";
import { IUnitRepository } from "../../../domain/repository/unit-repository.interface";
import { IBuildingRepository } from "../../../domain/repository/building-repository.interface";
import { IPaymentRecordRepository } from "../../../domain/repository/payment-record-repository.interface";
import { IAgreementRepository } from "../../../domain/repository/agreement-repository.interface";
import { IDocumentRepository } from "../../../domain/repository/document-repository.interface";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../../shared/error/app-error";
import { ITenantPortalTokenService } from "../../interface/common/tenant-portal-token-service.interface";
import { buildPeriod } from "../payment-record/payment-record-usecase";
import {
  TenantDueSummaryDTO,
  TenantLoginDTO,
  TenantPortalAuthResultDTO,
  TenantPortalDashboardDTO,
  TenantPortalProfileDTO,
  TenantSetPasswordDTO,
} from "../../dtos/tenant-portal/tenant-portal.dto";
import { ITenantPortalUseCases } from "../../interface/tenant-portal/tenant-portal-usecase.interface";

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const BLOCKED_STATUSES = ["blacklisted", "inactive"];

export class TenantPortalUseCases implements ITenantPortalUseCases {
  constructor(
    private readonly tenantRepo: ITenantRepository,
    private readonly unitRepo: IUnitRepository,
    private readonly buildingRepo: IBuildingRepository,
    private readonly paymentRecordRepo: IPaymentRecordRepository,
    private readonly agreementRepo: IAgreementRepository,
    private readonly documentRepo: IDocumentRepository,
    private readonly tokenService: ITenantPortalTokenService,
  ) {}

  private async buildProfile(tenant: ITenant): Promise<TenantPortalProfileDTO> {
    const [unit, building] = await Promise.all([
      tenant.unitId ? this.unitRepo.findById(tenant.unitId) : null,
      tenant.buildingId ? this.buildingRepo.findById(tenant.buildingId) : null,
    ]);

    return {
      _id: tenant._id!,
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      fullName: `${tenant.firstName} ${tenant.lastName}`,
      email: tenant.email,
      phone: tenant.phone,
      status: tenant.status,
      rentAmount: tenant.rentAmount,
      rentType: tenant.rentType,
      dueDate: tenant.dueDate,
      moveInDate: tenant.moveInDate,
      unit: unit
        ? {
            _id: unit._id!,
            unitNumber: unit.unitNumber,
            floorNumber: unit.floorNumber,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            amenities: unit.amenities,
            images: unit.images,
          }
        : undefined,
      building: building
        ? {
            _id: building._id!,
            name: building.name,
            address: building.location?.address,
            city: building.location?.city,
            state: building.location?.state,
          }
        : undefined,
    };
  }

  async login(data: TenantLoginDTO): Promise<TenantPortalAuthResultDTO> {
    if (!data.email?.trim() || !data.password) {
      throw new BadRequestError("Email and password are required.");
    }

    const candidates = (await this.tenantRepo.findByEmail(data.email)).filter(
      (t) => t.portalEnabled && t.password,
    );

    let matched: ITenant | null = null;
    for (const candidate of candidates) {
      const ok = await bcrypt.compare(data.password, candidate.password!);
      if (ok) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedError(
        "Invalid email or password.",
        "Check your credentials, or contact your property manager if you haven't set up your portal access yet.",
      );
    }

    if (BLOCKED_STATUSES.includes(matched.status)) {
      throw new ForbiddenError(
        "Your account is not currently active.",
        "Contact your property manager for assistance.",
      );
    }

    const token = this.tokenService.generateSessionToken(matched._id!);
    const profile = await this.buildProfile(matched);
    return { token, tenant: profile };
  }

  async setPassword(
    data: TenantSetPasswordDTO,
  ): Promise<TenantPortalAuthResultDTO> {
    if (!data.password || data.password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }

    const { tenantId } = this.tokenService.verifySetupToken(data.token);
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundError("Tenant not found.");
    if (!tenant.portalEnabled) {
      throw new BadRequestError(
        "Portal access is not enabled for this account.",
        "Ask your property manager to enable your tenant portal.",
      );
    }

    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);
    const updated = await this.tenantRepo.update(tenantId, {
      password: hashed,
      passwordSetAt: new Date(),
    });

    const token = this.tokenService.generateSessionToken(tenantId);
    const profile = await this.buildProfile(updated!);
    return { token, tenant: profile };
  }

  async getDashboard(tenantId: string): Promise<TenantPortalDashboardDTO> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundError("Tenant not found.");
    if (!tenant.portalEnabled) {
      throw new ForbiddenError(
        "Your portal access has been disabled.",
        "Contact your property manager to restore access.",
      );
    }

    const [profile, paymentRecords, agreements, documents] = await Promise.all([
      this.buildProfile(tenant),
      this.paymentRecordRepo.findByTenantId(tenantId),
      this.agreementRepo.findAll({ tenantId }),
      this.documentRepo.findAll({ tenantId }),
    ]);

    const dueSummary = this.computeDueSummary(tenant, paymentRecords);

    const paymentHistory = [...paymentRecords]
      .sort(
        (a, b) =>
          new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime(),
      )
      .slice(0, 24)
      .map((r) => ({
        _id: r._id!,
        periodLabel: r.periodLabel,
        amount: r.amount,
        status: r.status,
        paidAt: r.paidAt,
        method: r.method,
        receiptUrl: r.receiptUrl,
      }));

    const latestAgreement = [...agreements].sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime(),
    )[0];

    return {
      profile,
      dueSummary,
      paymentHistory,
      agreement: latestAgreement
        ? {
            _id: latestAgreement._id!,
            status: latestAgreement.status,
            startDate: latestAgreement.startDate,
            endDate: latestAgreement.endDate,
            monthlyRent: latestAgreement.monthlyRent,
            finalPdfUrl: latestAgreement.finalPdfUrl,
          }
        : undefined,
      documents: documents.map((d) => ({
        _id: d._id!,
        title: d.title,
        type: d.type,
        fileUrl: d.fileUrl,
        expiryDate: d.expiryDate,
      })),
    };
  }

  private computeDueSummary(
    tenant: ITenant,
    records: {
      periodStart: Date;
      periodEnd: Date;
      status: string;
      paidAt?: Date;
    }[],
  ): TenantDueSummaryDTO {
    const { label, start, end } = buildPeriod(tenant.rentType, new Date());

    const currentRecord = records.find((r) => {
      const rStart = new Date(r.periodStart).getTime();
      const rEnd = new Date(r.periodEnd).getTime();
      return rStart === start.getTime() && rEnd === end.getTime();
    });

    const lastPaid = [...records]
      .filter((r) => r.status === "paid" && r.paidAt)
      .sort(
        (a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime(),
      )[0];

    return {
      currentPeriodLabel: label,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      amountDue: tenant.rentAmount,
      isPaidForCurrentPeriod: currentRecord?.status === "paid",
      lastPaymentDate: lastPaid?.paidAt,
    };
  }
}
