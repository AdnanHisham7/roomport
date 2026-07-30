export type BookingPaymentMode = 'online' | 'offline';
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'refunded';
export type BookingRefundStatus = 'none' | 'initiated' | 'processed' | 'failed';

export interface Booking {
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
  refundedAt?: string;
  commissionRateSnapshot?: number;
  commissionAmount?: number;
  netAmountForBuilder?: number;
  rejectionReason?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface CreateBookingPayload {
  buildingId: string;
  unitId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  message?: string;
  paymentMode: BookingPaymentMode;
}

export interface CreateBookingResult {
  booking: Booking;
  razorpayOrder?: RazorpayOrder;
}

export interface VerifyBookingPaymentPayload {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
