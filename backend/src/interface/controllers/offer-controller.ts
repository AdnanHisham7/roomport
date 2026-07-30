import type { Request, Response } from "express";
import { AppError } from "../../shared/error/app-error";
import { IOfferUseCases } from "../../application/interface/offer/offer-usecase.interface";

export class OfferController {
  constructor(private readonly offerUseCases: IOfferUseCases) {}

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

  create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const offer = await this.offerUseCases.create(
        req.body,
        user.userId,
        user.role,
      );
      return res.status(201).json({ message: "Offer created.", data: offer });
    } catch (e) {
      return this.handleError(res, e, "Failed to create offer.");
    }
  };

  listForOwner = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const isActiveRaw = req.query.isActive as string | undefined;
      const result = await this.offerUseCases.listForOwner(
        user.userId,
        user.role,
        {
          buildingId: req.query.buildingId as string | undefined,
          unitId: req.query.unitId as string | undefined,
          isActive:
            isActiveRaw === undefined ? undefined : isActiveRaw === "true",
        },
        page,
        limit,
      );
      return res.status(200).json(result);
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch offers.");
    }
  };

  getById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const offer = await this.offerUseCases.getById(
        req.params.id as string,
        user.userId,
        user.role,
      );
      return res.status(200).json({ data: offer });
    } catch (e) {
      return this.handleError(res, e, "Failed to fetch offer.");
    }
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const offer = await this.offerUseCases.update(
        req.params.id as string,
        req.body,
        user.userId,
        user.role,
      );
      return res.status(200).json({ message: "Offer updated.", data: offer });
    } catch (e) {
      return this.handleError(res, e, "Failed to update offer.");
    }
  };

  remove = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      await this.offerUseCases.delete(
        req.params.id as string,
        user.userId,
        user.role,
      );
      return res.status(200).json({ message: "Offer removed." });
    } catch (e) {
      return this.handleError(res, e, "Failed to remove offer.");
    }
  };
}
