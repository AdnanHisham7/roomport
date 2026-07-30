import mongoose, { Document, Schema } from "mongoose";
import { IPlatformTransaction } from "../../../domain/entities/PlatformTransaction";

export interface IPlatformTransactionDocument
  extends Omit<IPlatformTransaction, "_id">, Document {}

const PlatformTransactionSchema = new Schema<IPlatformTransactionDocument>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    } as any,
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: "Building",
      required: true,
      index: true,
    } as any,
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    } as any,
    type: {
      type: String,
      enum: ["booking_payment", "refund_penalty"],
      required: true,
    },
    grossAmount: { type: Number, required: true },
    commissionRateSnapshot: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    builderAmount: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PlatformTransactionSchema.index({ bookingId: 1, type: 1 }, { unique: true });
PlatformTransactionSchema.index({ ownerId: 1, createdAt: -1 });

export const PlatformTransactionModel =
  mongoose.model<IPlatformTransactionDocument>(
    "PlatformTransaction",
    PlatformTransactionSchema,
  );
