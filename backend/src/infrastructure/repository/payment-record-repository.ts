import { PaymentRecordModel } from "../db/model/payment-record-model";
import { IPaymentRecord } from "../../domain/entities/PaymentRecord";
import { IPaymentRecordRepository } from "../../domain/repository/payment-record-repository.interface";

export class PaymentRecordRepository implements IPaymentRecordRepository {
  private toEntity(doc: any): IPaymentRecord {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...obj,
      _id: obj._id?.toString(),
      tenantId: obj.tenantId?.toString(),
      buildingId: obj.buildingId?.toString(),
      unitId: obj.unitId?.toString() ?? undefined,
      recordedBy: obj.recordedBy?.toString(),
    };
  }

  async create(
    data: Omit<IPaymentRecord, "_id" | "createdAt" | "updatedAt">,
  ): Promise<IPaymentRecord> {
    const doc = await PaymentRecordModel.create(data);
    return this.toEntity(doc);
  }

  async findByTenantId(tenantId: string): Promise<IPaymentRecord[]> {
    const docs = await PaymentRecordModel.find({ tenantId })
      .sort({ periodStart: -1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findByBuildingId(buildingId: string): Promise<IPaymentRecord[]> {
    const docs = await PaymentRecordModel.find({ buildingId })
      .sort({ periodStart: -1 })
      .lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string): Promise<IPaymentRecord | null> {
    const doc = await PaymentRecordModel.findById(id).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async update(
    id: string,
    data: Partial<IPaymentRecord>,
  ): Promise<IPaymentRecord | null> {
    const doc = await PaymentRecordModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean();
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async delete(id: string): Promise<boolean> {
    const result = await PaymentRecordModel.findByIdAndDelete(id);
    return !!result;
  }
}
