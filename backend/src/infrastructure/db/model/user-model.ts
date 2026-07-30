import mongoose, { Document, Schema } from "mongoose";
import type { IUser } from "../../../domain/entities/User";

export interface IUserDocument extends Omit<IUser, "_id">, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    phone_number: { type: String, default: null, trim: true },
    password: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending_verification"],
      default: "pending_verification",
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "manager"],
      required: true,
    },
    building_id: {
      type: Schema.Types.ObjectId,
      ref: "Building",
      default: null,
    } as any,
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    } as any,
    profile_image: { type: String, default: null },
    lastLoginAt: { type: Date, default: null },
    refresh_token: { type: String, default: null },
    phone_verified: { type: Boolean, default: false },
    email_verified: { type: Boolean, default: false },
    paymentStatus: { type: Boolean, default: false },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    } as any,
    payoutQrCodeUrl: { type: String, default: null },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<IUserDocument>("User", UserSchema);
