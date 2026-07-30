import {
  BookingPaymentMode,
  BookingRefundStatus,
  BookingStatus,
} from "../../../domain/entities/Booking";

export interface CreateBookingDTO {
  buildingId: string;
  unitId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  message?: string;
  paymentMode: BookingPaymentMode;
}

export interface RazorpayOrderDTO {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface CreateBookingResultDTO {
  booking: BookingResponseDTO;
  razorpayOrder?: RazorpayOrderDTO;
}

export interface VerifyBookingPaymentDTO {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface BookingResponseDTO {
  _id: string;
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
