import type { Request, Response } from "express";
import { IPublicUseCases } from "../../application/interface/public/public-usecase.interface";
import { AppError } from "../../shared/error/app-error";

export class PublicController {
  constructor(private readonly uc: IPublicUseCases) {}

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
    return res.status(500).json({
      message: fallback,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  listBuildings = async (req: Request, res: Response): Promise<Response> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
      const { city, state, type, search, sort } = req.query as Record<
        string,
        string
      >;
      const minRent =
        req.query.minRent !== undefined ? Number(req.query.minRent) : undefined;
      const maxRent =
        req.query.maxRent !== undefined ? Number(req.query.maxRent) : undefined;
      const bedrooms =
        req.query.bedrooms !== undefined
          ? Number(req.query.bedrooms)
          : undefined;

      const result = await this.uc.listBuildings(
        {
          city,
          state,
          type,
          search,
          minRent,
          maxRent,
          bedrooms,
          sort: sort as any,
        },
        page,
        limit,
      );
      return res.status(200).json(result);
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch listings.");
    }
  };

  getFeatured = async (req: Request, res: Response): Promise<Response> => {
    try {
      const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 8));
      const data = await this.uc.getFeaturedBuildings(limit);
      return res.status(200).json({ data });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch featured listings.");
    }
  };

  getBuildingDetail = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const data = await this.uc.getBuildingDetail(req.params.id);
      return res.status(200).json({ data });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch listing.");
    }
  };

  listUnits = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const data = await this.uc.listUnitsForBuilding(req.params.id);
      return res.status(200).json({ data });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch rooms.");
    }
  };

  getUnitDetail = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const data = await this.uc.getUnitDetail(req.params.id);
      return res.status(200).json({ data });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch room.");
    }
  };

  getFilters = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const data = await this.uc.getFilters();
      return res.status(200).json({ data });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch filters.");
    }
  };

  getNearby = async (req: Request, res: Response): Promise<Response> => {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radiusKm =
        req.query.radiusKm !== undefined ? Number(req.query.radiusKm) : 10;
      const limit =
        req.query.limit !== undefined ? Number(req.query.limit) : 10;
      const data = await this.uc.getNearbyBuildings(lat, lng, radiusKm, limit);
      return res.status(200).json({ data });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch nearby listings.");
    }
  };
}
