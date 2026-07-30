import type { Request, Response } from "express";
import { AppError } from "../../shared/error/app-error";
import { IPayoutUseCases } from "../../application/interface/payout/payout-usecase.interface";

export class PayoutController {
  constructor(private readonly payoutUseCases: IPayoutUseCases) {}

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

  getMyBalance = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const balance = await this.payoutUseCases.getMyBalance(user.userId);
      return res.status(200).json({ data: balance });
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch balance.");
    }
  };

  getMyTransactions = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await this.payoutUseCases.getMyTransactions(
        user.userId,
        page,
        limit,
      );
      return res.status(200).json(result);
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch transactions.");
    }
  };

  getAllBuilderBalances = async (
    _req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const balances = await this.payoutUseCases.getAllBuilderBalances();
      return res.status(200).json({ data: balances });
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch builder balances.");
    }
  };

  getBuilderBalance = async (req: Request, res: Response): Promise<Response> => {
    try {
      const balance = await this.payoutUseCases.getBuilderBalance(
        req.params.builderId as string,
      );
      return res.status(200).json({ data: balance });
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch builder balance.");
    }
  };

  getPlatformSummary = async (
    _req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const summary = await this.payoutUseCases.getPlatformSummary();
      return res.status(200).json({ data: summary });
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch platform summary.");
    }
  };

  markPayoutPaid = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const payout = await this.payoutUseCases.markPayoutPaid(
        req.params.builderId as string,
        req.body,
        user.userId,
      );
      return res
        .status(201)
        .json({ message: "Payout recorded.", data: payout });
    } catch (e) {
      return this.handleError(res, e, "Failed to record payout.");
    }
  };

  getAllTransactions = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await this.payoutUseCases.getAllTransactions(
        {
          ownerId: req.query.ownerId as string | undefined,
          buildingId: req.query.buildingId as string | undefined,
        },
        page,
        limit,
      );
      return res.status(200).json(result);
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch transactions.");
    }
  };
}
