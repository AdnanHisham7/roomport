import { env } from "../../../infrastructure/config/env";
import { logger } from "../../../shared/logger/logger";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  AgreementStatus,
  IAgreement,
} from "../../../domain/entities/Agreement";
import {
  AgreementResponseDTO,
  CreateAgreementDTO,
  InitiateSigningDTO,
  PublicAgreementDTO,
  VerifySigningOtpDTO,
  ViewAgreementDTO,
} from "../../dtos/agreement/agreement.dto";
import { IAgreementUseCases } from "../../interface/agreement/agreement-usecase.interface";
import { IAgreementRepository } from "../../../domain/repository/agreement-repository.interface";
import { ITenantRepository } from "../../../domain/repository/tenant-repository.interface";
import { IDocumentRepository } from "../../../domain/repository/document-repository.interface";
import { EmailService } from "../../../infrastructure/services/email-service";
import { PdfService } from "../../../infrastructure/services/pdf-service";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../../shared/error/app-error";

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;
const DEFAULT_TOKEN_HOURS = 72;

// ── helpers ────────────────────────────────────────────────────────────────────
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateRawToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function toResponse(a: IAgreement): AgreementResponseDTO {
  return {
    _id: a._id!,
    tenantId: a.tenantId,
    buildingId: a.buildingId,
    unitId: a.unitId,
    createdBy: a.createdBy,
    title: a.title,
    body: a.body,
    terms: a.terms,
    monthlyRent: a.monthlyRent,
    startDate: a.startDate,
    endDate: a.endDate,
    status: a.status,
    typedSignatureName: a.typedSignatureName,
    finalPdfUrl: a.finalPdfUrl,
    documentId: a.documentId,
    audit: a.audit,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

const LOCKED_STATUSES: AgreementStatus[] = [
  "verified",
  "completed",
  "expired",
  "cancelled",
];

export class AgreementUseCases implements IAgreementUseCases {
  constructor(
    private readonly agreementRepo: IAgreementRepository,
    private readonly tenantRepo: ITenantRepository,
    private readonly documentRepo: IDocumentRepository,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {}

  // ── STEP 1: Admin creates a draft ──────────────────────────────────────────
  async create(data: CreateAgreementDTO): Promise<AgreementResponseDTO> {
    const tenant = await this.tenantRepo.findById(data.tenantId);
    if (!tenant)
      throw new NotFoundError(
        "Tenant not found.",
        "Check the tenantId and try again.",
      );

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end <= start)
      throw new BadRequestError("endDate must be after startDate.");
    if (data.monthlyRent < 0)
      throw new BadRequestError("monthlyRent must be a positive number.");

    const agreement = await this.agreementRepo.create({
      tenantId: data.tenantId,
      buildingId: data.buildingId,
      unitId: data.unitId,
      createdBy: data.createdBy,
      title: data.title.trim(),
      body: data.body,
      terms: data.terms,
      monthlyRent: data.monthlyRent,
      startDate: start,
      endDate: end,
      status: "draft",
      audit: {},
    });

    return toResponse(agreement);
  }

  // ── STEP 2: Admin sends signing link ───────────────────────────────────────
  async sendSigningLink(
    agreementId: string,
    expiresInHours: number = DEFAULT_TOKEN_HOURS,
  ): Promise<{ message: string; expiresAt: Date }> {
    const agreement = await this.agreementRepo.findById(agreementId);
    if (!agreement) throw new NotFoundError("Agreement not found.");

    if (LOCKED_STATUSES.includes(agreement.status)) {
      throw new ForbiddenError(
        `Agreement is ${agreement.status} and cannot be sent.`,
        "Only draft agreements can be sent for signing.",
      );
    }

    const tenant = await this.tenantRepo.findById(agreement.tenantId);
    if (!tenant) throw new NotFoundError("Tenant not found.");

    // Generate raw token → hash for DB → send raw in link
    const rawToken = generateRawToken();
    const signingTokenHash = hashToken(rawToken);
    const tokenExpiresAt = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1000,
    );

    await this.agreementRepo.update(agreementId, {
      signingTokenHash,
      tokenExpiresAt,
      status: "sent",
      audit: { ...agreement.audit, sentAt: new Date() },
    });

    const appUrl = env.APP_URL || "http://localhost:3000";
    const signingUrl = `${appUrl}/sign/${rawToken}`;

    await this.emailService.sendSigningLink(
      tenant.email,
      `${tenant.firstName} ${tenant.lastName}`,
      signingUrl,
      agreement.title,
      expiresInHours,
    );

    return {
      message: "Signing link sent to tenant.",
      expiresAt: tokenExpiresAt,
    };
  }

  // ── STEP 3: Tenant opens signing link — view agreement ────────────────────
  async viewByToken(dto: ViewAgreementDTO): Promise<PublicAgreementDTO> {
    const tokenHash = hashToken(dto.rawToken);
    const agreement = await this.agreementRepo.findByTokenHash(tokenHash);

    if (!agreement)
      throw new NotFoundError(
        "Invalid signing link.",
        "Request a new link from your property manager.",
      );

    this._assertTokenNotExpired(agreement);
    this._assertNotLocked(agreement, "view");

    // Mark as viewed (only on first view)
    if (agreement.status === "sent") {
      await this.agreementRepo.update(agreement._id!, {
        status: "viewed",
        audit: {
          ...agreement.audit,
          viewedAt: new Date(),
          signerIp: dto.signerIp,
          signerUserAgent: dto.signerUserAgent,
        },
      });
    }

    const tenant = await this.tenantRepo.findById(agreement.tenantId);

    return {
      _id: agreement._id!,
      title: agreement.title,
      body: agreement.body,
      terms: agreement.terms,
      monthlyRent: agreement.monthlyRent,
      startDate: agreement.startDate,
      endDate: agreement.endDate,
      status: agreement.status === "sent" ? "viewed" : agreement.status,
      tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : undefined,
    };
  }

  // ── STEP 4 + 5: Tenant types name → OTP sent ──────────────────────────────
  async initiateSigning(
    dto: InitiateSigningDTO,
  ): Promise<{ message: string; otpExpiresAt: Date }> {
    const tokenHash = hashToken(dto.rawToken);
    const agreement = await this.agreementRepo.findByTokenHash(tokenHash);

    if (!agreement) throw new NotFoundError("Invalid signing link.");
    this._assertTokenNotExpired(agreement);
    this._assertNotLocked(agreement, "sign");

    if (!dto.typedSignatureName?.trim()) {
      throw new BadRequestError(
        "typedSignatureName is required.",
        "Please type your full legal name.",
      );
    }

    const tenant = await this.tenantRepo.findById(agreement.tenantId);
    if (!tenant) throw new NotFoundError("Tenant not found.");

    // Generate OTP → hash for DB → send plain via email
    const rawOtp = generateOtp();
    const otpHash = await bcrypt.hash(rawOtp, SALT_ROUNDS);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.agreementRepo.update(agreement._id!, {
      typedSignatureName: dto.typedSignatureName.trim(),
      otpHash,
      otpExpiresAt,
      status: "otp_sent",
      audit: {
        ...agreement.audit,
        signedAt: new Date(),
        signerIp: dto.signerIp ?? agreement.audit.signerIp,
        signerUserAgent: dto.signerUserAgent ?? agreement.audit.signerUserAgent,
      },
    });

    await this.emailService.sendAgreementOtp(
      tenant.email,
      `${tenant.firstName} ${tenant.lastName}`,
      rawOtp,
    );

    return {
      message: `OTP sent to ${tenant.email}. Enter it to complete signing.`,
      otpExpiresAt,
    };
  }

  // ── STEPS 6-10: Verify OTP → complete → generate PDF → archive ────────────
  async verifySigningOtp(
    dto: VerifySigningOtpDTO,
  ): Promise<{ message: string; finalPdfUrl: string }> {
    const tokenHash = hashToken(dto.rawToken);
    const agreement = await this.agreementRepo.findByTokenHash(tokenHash);

    if (!agreement) throw new NotFoundError("Invalid signing link.");
    this._assertTokenNotExpired(agreement);

    if (agreement.status !== "otp_sent") {
      throw new BadRequestError(
        "No OTP is pending for this agreement.",
        "Please initiate signing first.",
      );
    }

    // ── OTP expiry check ────────────────────────────────────────────────────
    if (!agreement.otpHash || !agreement.otpExpiresAt) {
      throw new BadRequestError(
        "No OTP was requested.",
        "Please initiate signing again.",
      );
    }
    if (new Date() > agreement.otpExpiresAt) {
      throw new BadRequestError(
        "OTP has expired.",
        "Please initiate signing again to receive a new OTP.",
      );
    }

    // ── OTP hash comparison ─────────────────────────────────────────────────
    const isOtpValid = await bcrypt.compare(dto.otp, agreement.otpHash);
    if (!isOtpValid) {
      throw new BadRequestError(
        "Invalid OTP.",
        "Check the OTP sent to your email and try again.",
      );
    }

    const now = new Date();
    const tenant = await this.tenantRepo.findById(agreement.tenantId);
    if (!tenant) throw new NotFoundError("Tenant not found.");

    // ── STEP 8: Generate PDF ────────────────────────────────────────────────
    const completedAt = now;
    const finalPdfUrl = await this.pdfService.generateAgreementPdf({
      agreementId: agreement._id!,
      title: agreement.title,
      body: agreement.body,
      terms: agreement.terms,
      tenantName: `${tenant.firstName} ${tenant.lastName}`,
      tenantEmail: tenant.email,
      propertyName: agreement.buildingId, // swap for populated name in production    // swap for populated name in production
      monthlyRent: agreement.monthlyRent,
      startDate: agreement.startDate,
      endDate: agreement.endDate,
      typedSignatureName: agreement.typedSignatureName!,
      signedAt: agreement.audit.signedAt!,
      verifiedAt: now,
      completedAt,
      signerIp: dto.signerIp ?? agreement.audit.signerIp,
    });

    // ── STEP 9: Archive to Document collection ──────────────────────────────
    const docRecord = await this.documentRepo.create({
      tenantId: agreement.tenantId,
      buildingId: agreement.buildingId,
      type: "rental_agreement",
      title: `Signed: ${agreement.title}`,
      description: `Digitally signed rental agreement. Signer: ${agreement.typedSignatureName}`,
      fileUrl: finalPdfUrl,
      uploadedBy: agreement.createdBy,
    });

    // ── STEP 10: Lock agreement — mark completed ────────────────────────────
    await this.agreementRepo.update(agreement._id!, {
      status: "completed",
      finalPdfUrl,
      documentId: docRecord._id!,
      otpHash: undefined, // clear sensitive fields
      otpExpiresAt: undefined,
      audit: {
        ...agreement.audit,
        verifiedAt: now,
        completedAt,
        signerIp: dto.signerIp ?? agreement.audit.signerIp,
        signerUserAgent: dto.signerUserAgent ?? agreement.audit.signerUserAgent,
      },
    });

    // Non-blocking completion email
    this.emailService
      .sendCompletionEmail(
        tenant.email,
        `${tenant.firstName} ${tenant.lastName}`,
        agreement.title,
        finalPdfUrl,
      )
      .catch((err) =>
        logger.error("[EmailService] Completion email failed:", err),
      );

    return {
      message: "Agreement signed, verified, and completed successfully.",
      finalPdfUrl,
    };
  }

  // ── Admin: get all ─────────────────────────────────────────────────────────
  async getAll(filter?: {
    tenantId?: string;
    buildingId?: string;
    status?: AgreementStatus;
  }): Promise<AgreementResponseDTO[]> {
    const agreements = await this.agreementRepo.findAll(filter);
    return agreements.map(toResponse);
  }

  // ── Admin: get by id ───────────────────────────────────────────────────────
  async getById(id: string): Promise<AgreementResponseDTO> {
    const agreement = await this.agreementRepo.findById(id);
    if (!agreement) throw new NotFoundError("Agreement not found.");
    return toResponse(agreement);
  }

  // ── Admin: cancel ──────────────────────────────────────────────────────────
  async cancel(agreementId: string): Promise<AgreementResponseDTO> {
    const agreement = await this.agreementRepo.findById(agreementId);
    if (!agreement) throw new NotFoundError("Agreement not found.");

    if (["completed", "cancelled"].includes(agreement.status)) {
      throw new ForbiddenError(
        `Cannot cancel a ${agreement.status} agreement.`,
        "Only active agreements can be cancelled.",
      );
    }

    const updated = await this.agreementRepo.update(agreementId, {
      status: "cancelled",
    });
    return toResponse(updated!);
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  private _assertTokenNotExpired(agreement: IAgreement): void {
    if (agreement.tokenExpiresAt && new Date() > agreement.tokenExpiresAt) {
      throw new ForbiddenError(
        "This signing link has expired.",
        "Please ask your property manager to send a new signing link.",
      );
    }
  }

  private _assertNotLocked(agreement: IAgreement, action: string): void {
    if (LOCKED_STATUSES.includes(agreement.status)) {
      throw new ForbiddenError(
        `This agreement is ${agreement.status} and cannot be ${action}ed.`,
        "Contact your property manager for assistance.",
      );
    }
  }
}
