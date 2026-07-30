import { AgreementStatus } from "../../../domain/entities/Agreement";
import {
  AgreementResponseDTO,
  CreateAgreementDTO,
  InitiateSigningDTO,
  PublicAgreementDTO,
  VerifySigningOtpDTO,
  ViewAgreementDTO,
} from "../../dtos/agreement/agreement.dto";

export interface IAgreementUseCases {
  // ── Admin ──────────────────────────────────────────────────────────────────
  create(data: CreateAgreementDTO): Promise<AgreementResponseDTO>;
  getAll(filter?: {
    tenantId?: string;
    buildingId?: string;
    status?: AgreementStatus;
  }): Promise<AgreementResponseDTO[]>;
  getById(id: string): Promise<AgreementResponseDTO>;
  sendSigningLink(
    agreementId: string,
    expiresInHours?: number,
  ): Promise<{ message: string; expiresAt: Date }>;
  cancel(agreementId: string): Promise<AgreementResponseDTO>;

  // ── Public (tenant — no auth, token-based) ─────────────────────────────────
  viewByToken(dto: ViewAgreementDTO): Promise<PublicAgreementDTO>;
  initiateSigning(
    dto: InitiateSigningDTO,
  ): Promise<{ message: string; otpExpiresAt: Date }>;
  verifySigningOtp(
    dto: VerifySigningOtpDTO,
  ): Promise<{ message: string; finalPdfUrl: string }>;
}
