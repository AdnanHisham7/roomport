import type { Request, Response } from "express";
import type {
  CreateFloorDTO,
  UpdateFloorDTO,
} from "../../application/dtos/floor/floor.dto";
import { IFloorUseCases } from "../../application/interface/floor/floor-usecase.interface";
import { AppError } from "../../shared/error/app-error";

export class FloorController {
  constructor(private readonly floorUseCases: IFloorUseCases) {}

  private static getSingleParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  }

  getByBuilding = async (
    req: Request<{ buildingId: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const buildingId = FloorController.getSingleParam(req.params.buildingId);
      const floors = await this.floorUseCases.getByBuilding(buildingId);
      return res
        .status(200)
        .json({
          message: "Floors fetched.",
          count: floors.length,
          data: floors,
        });
    } catch (err) {
      return this.handleError(res, err, "Failed to fetch floors.");
    }
  };

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const floor = await this.floorUseCases.getById(
        FloorController.getSingleParam(req.params.id),
      );
      return res.status(200).json({ message: "Floor fetched.", data: floor });
    } catch (err) {
      return this.handleError(res, err, "Failed to fetch floor.");
    }
  };

  create = async (
    req: Request<
      { buildingId: string },
      {},
      Omit<CreateFloorDTO, "buildingId">
    >,
    res: Response,
  ): Promise<Response> => {
    try {
      const floor = await this.floorUseCases.create(
        {
          buildingId: FloorController.getSingleParam(req.params.buildingId),
          floorNumber: req.body.floorNumber,
          name: req.body.name,
          totalUnits: req.body.totalUnits,
          description: req.body.description,
        },
        req.user!.userId,
        req.user!.role,
      );
      return res.status(201).json({ message: "Floor created.", data: floor });
    } catch (err) {
      return this.handleError(res, err, "Failed to create floor.");
    }
  };

  update = async (
    req: Request<{ id: string }, {}, UpdateFloorDTO>,
    res: Response,
  ): Promise<Response> => {
    try {
      const floor = await this.floorUseCases.update(
        FloorController.getSingleParam(req.params.id),
        req.body,
        req.user!.userId,
        req.user!.role,
      );
      return res.status(200).json({ message: "Floor updated.", data: floor });
    } catch (err) {
      return this.handleError(res, err, "Failed to update floor.");
    }
  };

  delete = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      await this.floorUseCases.delete(
        FloorController.getSingleParam(req.params.id),
        req.user!.userId,
        req.user!.role,
      );
      return res.status(200).json({ message: "Floor deleted." });
    } catch (err) {
      return this.handleError(res, err, "Failed to delete floor.");
    }
  };

  private handleError(
    res: Response,
    error: unknown,
    fallback: string,
  ): Response {
    if (error instanceof AppError)
      return res
        .status(error.statusCode)
        .json({ message: error.message, suggestion: error.suggestion });
    return res
      .status(500)
      .json({
        message: fallback,
        suggestion: "Please try again later.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }
}
