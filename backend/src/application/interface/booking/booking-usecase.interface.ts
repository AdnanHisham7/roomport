import { BookingStatus } from "../../../domain/entities/Booking";
import {
  BookingResponseDTO,
  CreateBookingDTO,
  CreateBookingResultDTO,
  VerifyBookingPaymentDTO,
} from "../../dtos/booking/booking.dto";

export interface IBookingUseCases {
  create(data: CreateBookingDTO): Promise<CreateBookingResultDTO>;

  verifyPayment(data: VerifyBookingPaymentDTO): Promise<BookingResponseDTO>;

  listForOwner(
    requesterId: string,
    requesterRole: string,
    filter: { buildingId?: string; unitId?: string; status?: BookingStatus },
    page: number,
    limit: number,
  ): Promise<{
    data: BookingResponseDTO[];
    total: number;
    page: number;
    limit: number;
  }>;

  getById(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<BookingResponseDTO>;

  confirm(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<BookingResponseDTO>;

  reject(
    id: string,
    requesterId: string,
    requesterRole: string,
    reason?: string,
  ): Promise<BookingResponseDTO>;

  refund(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<BookingResponseDTO>;

  handleWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
  ): Promise<void>;
}
