import {
  PaymentRecordResponseDTO,
  RecordPaymentDTO,
  UpdatePaymentRecordDTO,
} from "../../dtos/payment-record/payment-record.dto";

export interface IPaymentRecordUseCases {
  listByTenant(
    tenantId: string,
    userId: string,
    role: string,
  ): Promise<PaymentRecordResponseDTO[]>;

  record(
    tenantId: string,
    data: RecordPaymentDTO,
    userId: string,
    role: string,
  ): Promise<PaymentRecordResponseDTO>;

  update(
    id: string,
    data: UpdatePaymentRecordDTO,
    userId: string,
    role: string,
  ): Promise<PaymentRecordResponseDTO>;

  remove(id: string, userId: string, role: string): Promise<void>;
}
