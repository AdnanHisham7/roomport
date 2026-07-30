import mongoose, { Document, Schema } from "mongoose";
import { IPlatformSetting } from "../../../domain/entities/PlatformSetting";

export interface IPlatformSettingDocument
  extends Omit<IPlatformSetting, "_id">, Document {}

const PlatformSettingSchema = new Schema<IPlatformSettingDocument>(
  {
    platformName: { type: String, default: "Brift" },
    supportEmail: { type: String, default: null },
    pricePerBuilding: { type: Number, default: 1000 },
    pricePerUnit: { type: Number, default: 100 },
    monthlyPricePerBuilding: { type: Number, default: 1000 },
    monthlyPricePerUnit: { type: Number, default: 100 },
    yearlyPricePerBuilding: { type: Number, default: 10000 },
    yearlyPricePerUnit: { type: Number, default: 1000 },
    currency: { type: String, default: "inr" },
    maintenanceMode: { type: Boolean, default: false },
    maxFeaturedBuildings: { type: Number, default: 8 },
    commissionRatePercentage: { type: Number, default: 10, min: 0, max: 100 },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    } as any,
  },
  { timestamps: true },
);

export const PlatformSettingModel = mongoose.model<IPlatformSettingDocument>(
  "PlatformSetting",
  PlatformSettingSchema,
);
