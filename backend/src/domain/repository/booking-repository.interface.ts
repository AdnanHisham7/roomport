import { IBooking, BookingStatus } from "../entities/Booking";

export interface BookingListFilter {
  buildingId?: string;
  unitId?: string;
  ownerId?: string;
  status?: BookingStatus;
}

export interface IBookingRepository {
  create(
    data: Omit<IBooking, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IBooking>;

  findById(id: string): Promise<IBooking | null>;

  findByRazorpayOrderId(orderId: string): Promise<IBooking | null>;

  findByRazorpayPaymentId(paymentId: string): Promise<IBooking | null>;

  findAll(filter?: BookingListFilter): Promise<IBooking[]>;

  findAllPaginated(
    filter: BookingListFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: IBooking[]; total: number }>;

  update(id: string, data: Partial<IBooking>): Promise<IBooking | null>;
}
