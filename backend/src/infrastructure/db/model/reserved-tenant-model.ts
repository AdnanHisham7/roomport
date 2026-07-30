import mongoose, { Document, Schema } from "mongoose";
import { IReservedTenant } from "../../../domain/entities/ReservedTenant";

export interface IReservedTenantDocument
  extends Omit<IReservedTenant, "_id">, Document {}

const ReservedTenantSchema = new Schema<IReservedTenantDocument>(
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
      unique: true,
      index: true,
    } as any,
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    } as any,
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    } as any,
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: null, trim: true },
    amount: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    reservedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const ReservedTenantModel = mongoose.model<IReservedTenantDocument>(
  "ReservedTenant",
  ReservedTenantSchema,
);
