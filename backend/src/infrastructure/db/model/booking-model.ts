import mongoose, { Document, Schema } from "mongoose";
import { IBooking } from "../../../domain/entities/Booking";

export interface IBookingDocument extends Omit<IBooking, "_id">, Document {}

const BookingSchema = new Schema<IBookingDocument>(
  {
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: "Building",
      required: true,
      index: true,
    } as any,
    unitId: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
      index: true,
    } as any,
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    } as any,
    applicantName: { type: String, required: true, trim: true },
    applicantEmail: { type: String, required: true, trim: true, lowercase: true },
    applicantPhone: { type: String, default: null, trim: true },
    message: { type: String, default: null, trim: true },
    paymentMode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    isPaid: { type: Boolean, default: false },
    priorityScore: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    razorpayOrderId: { type: String, default: null, index: true, sparse: true },
    razorpayPaymentId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    razorpaySignature: { type: String, default: null },
    refundId: { type: String, default: null },
    refundStatus: {
      type: String,
      enum: ["none", "initiated", "processed", "failed"],
      default: "none",
    },
    refundedAt: { type: Date, default: null },
    commissionRateSnapshot: { type: Number, default: null },
    commissionAmount: { type: Number, default: null },
    netAmountForBuilder: { type: Number, default: null },
    rejectionReason: { type: String, default: null, trim: true },
    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    } as any,
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

BookingSchema.index({ unitId: 1, status: 1 });
BookingSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ priorityScore: -1, createdAt: 1 });

export const BookingModel = mongoose.model<IBookingDocument>(
  "Booking",
  BookingSchema,
);
