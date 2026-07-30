import type { Request, Response } from "express";
import { AppError } from "../../shared/error/app-error";
import { IPaymentRecordUseCases } from "../../application/interface/payment-record/payment-record-usecase.interface";

export class PaymentRecordController {
  constructor(private readonly paymentRecordUseCases: IPaymentRecordUseCases) {}

  private handleError(
    res: Response,
    error: unknown,
    fallback: string,
  ): Response {
    if (error instanceof AppError)
      return res
        .status(error.statusCode)
        .json({ message: error.message, suggestion: error.suggestion });
    return res.status(500).json({ message: fallback });
  }

  listByTenant = async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = req.params.tenantId as string;
      const user = req.user!;
      const records = await this.paymentRecordUseCases.listByTenant(
        tenantId,
        user.userId,
        user.role,
      );
      return res.status(200).json({ data: records });
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch payment records.");
    }
  };

  record = async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = req.params.tenantId as string;
      const user = req.user!;
      const record = await this.paymentRecordUseCases.record(
        tenantId,
        req.body,
        user.userId,
        user.role,
      );
      return res
        .status(201)
        .json({ message: "Payment recorded.", data: record });
    } catch (e) {
      return this.handleError(res, e, "Failed to record payment.");
    }
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;
      const user = req.user!;
      const record = await this.paymentRecordUseCases.update(
        id,
        req.body,
        user.userId,
        user.role,
      );
      return res.status(200).json({ message: "Updated.", data: record });
    } catch (e) {
      return this.handleError(res, e, "Failed to update payment record.");
    }
  };

  remove = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;
      const user = req.user!;
      await this.paymentRecordUseCases.remove(id, user.userId, user.role);
      return res.status(200).json({ message: "Deleted." });
    } catch (e) {
      return this.handleError(res, e, "Failed to delete payment record.");
    }
  };
}
