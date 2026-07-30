import { IBooking } from "../../domain/entities/Booking";
import {
  BookingListFilter,
  IBookingRepository,
} from "../../domain/repository/booking-repository.interface";
import { BookingModel } from "../db/model/booking-model";

export class BookingRepository implements IBookingRepository {
  private toStringId(doc: { _id: unknown }): string {
    return (doc._id as { toString(): string }).toString();
  }

  private toEntity(doc: any): IBooking {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: this.toStringId(obj),
      buildingId: obj.buildingId?.toString() ?? "",
      unitId: obj.unitId?.toString() ?? "",
      ownerId: obj.ownerId?.toString() ?? "",
      decidedBy: obj.decidedBy?.toString() ?? undefined,
    };
  }

  private buildQuery(filter?: BookingListFilter): Record<string, any> {
    const q: Record<string, any> = {};
    if (filter?.buildingId) q.buildingId = filter.buildingId;
    if (filter?.unitId) q.unitId = filter.unitId;
    if (filter?.ownerId) q.ownerId = filter.ownerId;
    if (filter?.status) q.status = filter.status;
    return q;
  }

  async create(
    data: Omit<IBooking, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IBooking> {
    const doc = await BookingModel.create(data);
    return this.toEntity(doc);
  }

  async findById(id: string): Promise<IBooking | null> {
    const doc = await BookingModel.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findByRazorpayOrderId(orderId: string): Promise<IBooking | null> {
    const doc = await BookingModel.findOne({ razorpayOrderId: orderId }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findByRazorpayPaymentId(paymentId: string): Promise<IBooking | null> {
    const doc = await BookingModel.findOne({
      razorpayPaymentId: paymentId,
    }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(filter?: BookingListFilter): Promise<IBooking[]> {
    const docs = await BookingModel.find(this.buildQuery(filter))
      .sort({ priorityScore: -1, createdAt: 1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findAllPaginated(
    filter: BookingListFilter,
    skip: number,
    limit: number,
  ): Promise<{ data: IBooking[]; total: number }> {
    const q = this.buildQuery(filter);
    const [docs, total] = await Promise.all([
      BookingModel.find(q)
        .sort({ priorityScore: -1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BookingModel.countDocuments(q),
    ]);
    return { data: docs.map((d) => this.toEntity(d)), total };
  }

  async update(id: string, data: Partial<IBooking>): Promise<IBooking | null> {
    const doc = await BookingModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean();
    return doc ? this.toEntity(doc) : null;
  }
}
