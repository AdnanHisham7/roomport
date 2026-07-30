export type PlatformTransactionType = "booking_payment" | "refund_penalty";

export interface IPlatformTransaction {
  _id?: string;
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
