import { PlatformTransactionType } from "../../../domain/entities/PlatformTransaction";

export interface BuilderBalanceDTO {
  builderId: string;
  builderName: string;
  builderEmail: string;
  payoutQrCodeUrl?: string;
  totalGrossCollected: number;
  totalCommission: number;
  totalOwed: number;
  totalPaidOut: number;
  pendingBalance: number;
}

export interface PlatformSummaryDTO {
  commissionRatePercentage: number;
  totalGrossVolume: number;
  totalCommissionEarned: number;
  totalPaidOutToBuilders: number;
  totalPendingPayouts: number;
}

export interface MarkPayoutPaidDTO {
  amount: number;
  note?: string;
}

export interface PlatformTransactionResponseDTO {
  _id: string;
  bookingId: string;
  buildingId: string;
  ownerId: string;
  type: PlatformTransactionType;
  grossAmount: number;
  commissionRateSnapshot: number;
  commissionAmount: number;
  builderAmount: number;
  createdAt?: Date;
}

export interface BuilderPayoutResponseDTO {
  _id: string;
  builderId: string;
  amount: number;
  markedBy: string;
  note?: string;
  createdAt?: Date;
}
