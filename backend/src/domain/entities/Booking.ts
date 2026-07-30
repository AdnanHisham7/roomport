export type BookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "refunded";

export type BookingPaymentMode = "online" | "offline";

export type BookingRefundStatus = "none" | "initiated" | "processed" | "failed";

export interface IBooking {
  _id?: string;
  buildingId: string;
  unitId: string;
  ownerId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  message?: string;
  paymentMode: BookingPaymentMode;
  amount: number;
  isPaid: boolean;
  priorityScore: number;
  status: BookingStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  refundId?: string;
  refundStatus: BookingRefundStatus;
  refundedAt?: Date;
  commissionRateSnapshot?: number;
  commissionAmount?: number;
  netAmountForBuilder?: number;
  rejectionReason?: string;
  decidedBy?: string;
  decidedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
