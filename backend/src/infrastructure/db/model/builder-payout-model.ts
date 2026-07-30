import mongoose, { Document, Schema } from "mongoose";
import { IBuilderPayout } from "../../../domain/entities/BuilderPayout";

export interface IBuilderPayoutDocument
  extends Omit<IBuilderPayout, "_id">, Document {}

const BuilderPayoutSchema = new Schema<IBuilderPayoutDocument>(
  {
    builderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    } as any,
    amount: { type: Number, required: true, min: 0.01 },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    } as any,
    note: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

BuilderPayoutSchema.index({ builderId: 1, createdAt: -1 });

export const BuilderPayoutModel = mongoose.model<IBuilderPayoutDocument>(
  "BuilderPayout",
  BuilderPayoutSchema,
);
