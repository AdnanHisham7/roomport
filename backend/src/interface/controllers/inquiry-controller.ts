import type { Request, Response } from "express";
import { IInquiryUseCases } from "../../application/interface/inquiry/inquiry-usecase.interface";
import { AppError } from "../../shared/error/app-error";

export class InquiryController {
  constructor(private readonly uc: IInquiryUseCases) {}

  private handleError(
    res: Response,
    error: unknown,
    fallback: string,
  ): Response {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ message: error.message, suggestion: error.suggestion });
    }
    return res
      .status(500)
      .json({
        message: fallback,
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }

  create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await this.uc.create(req.body);
      return res
        .status(201)
        .json({
          message:
            "Thanks! The listing owner has been notified and will reach out soon.",
          data,
        });
    } catch (error) {
      return this.handleError(res, error, "Failed to submit inquiry.");
    }
  };

  list = async (req: Request, res: Response): Promise<Response> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const { buildingId, status } = req.query as Record<string, string>;
      const result = await this.uc.listForOwner(
        req.user!.userId,
        req.user!.role,
        { buildingId, status: status as any },
        page,
        limit,
      );
      return res.status(200).json(result);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch inquiries.");
    }
  };

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const data = await this.uc.getById(
        req.params.id,
        req.user!.userId,
        req.user!.role,
      );
      return res.status(200).json({ data });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch inquiry.");
    }
  };

  updateStatus = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const data = await this.uc.updateStatus(
        req.params.id,
        req.body.status,
        req.user!.userId,
        req.user!.role,
      );
      return res.status(200).json({ message: "Inquiry updated.", data });
    } catch (error) {
      return this.handleError(res, error, "Failed to update inquiry.");
    }
  };

  delete = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      await this.uc.delete(req.params.id, req.user!.userId, req.user!.role);
      return res.status(200).json({ message: "Inquiry deleted." });
    } catch (error) {
      return this.handleError(res, error, "Failed to delete inquiry.");
    }
  };
}
