import type { Request, Response } from "express";
import { IBuildingUseCases } from "../../application/interface/building/building-usecase.interface";
import type {
  CreateBuildingDTO,
  UpdateBuildingDTO,
} from "../../application/dtos/building/building.dto";
import type {
  BuildingStatus,
  BuildingType,
} from "../../domain/entities/Building";
import {
  AppError,
  BadRequestError,
  ForbiddenError,
} from "../../shared/error/app-error";
import { IUserUseCase } from "../../application/interface/user/user-usecase.interface";

export class BuildingController {
  constructor(
    private readonly uc: IBuildingUseCases,
    private readonly userUseCase: IUserUseCase,
  ) {}

  private static getSingleParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  }

  private handleError(
    res: Response,
    error: unknown,
    fallbackMessage: string,
  ): Response {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
        suggestion: error.suggestion,
      });
    }

    return res.status(500).json({
      message: fallbackMessage,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  /** Resolves the (ownerId, managerId) pair for a building this requester is allowed to act as. */
  private async resolveOwnership(
    req: Request,
  ): Promise<{ ownerId: string; managerId?: string }> {
    const user = req.user!;
    if (user.role === "admin") {
      return { ownerId: user.userId };
    }
    if (user.role === "manager") {
      const manager = await this.userUseCase.getProfile(user.userId);
      if (!manager?.ownerId) {
        throw new ForbiddenError(
          "This manager account is not linked to a builder.",
          "Contact your admin to fix your account setup.",
        );
      }
      return { ownerId: manager.ownerId, managerId: user.userId };
    }
    // super_admin — must explicitly say whose building this is
    if (!req.body.ownerId) {
      throw new BadRequestError(
        "ownerId is required.",
        "Specify which builder this building belongs to.",
      );
    }
    return { ownerId: req.body.ownerId, managerId: req.body.managerId };
  }

  getOccupancyStats = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const user = req.user!;
      const ownerId =
        user.role === "super_admin"
          ? (req.query.ownerId as string | undefined)
          : user.role === "admin"
            ? user.userId
            : undefined;
      const data = await this.uc.getOccupancyStats(ownerId);

      return res.status(200).json({ data });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch occupancy stats.");
    }
  };

  getAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const { status, type } = req.query as {
        status?: BuildingStatus;
        type?: BuildingType;
      };

      let ownerId: string | undefined;
      let managerId: string | undefined;

      if (user.role === "admin") {
        ownerId = user.userId;
      } else if (user.role === "manager") {
        managerId = user.userId;
      } else {
        // super_admin can optionally filter
        ownerId = req.query.ownerId as string | undefined;
        managerId = req.query.managerId as string | undefined;
      }

      const data = await this.uc.getAll({ ownerId, managerId, status, type });

      return res.status(200).json({ data });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch buildings.");
    }
  };

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const id = BuildingController.getSingleParam(req.params.id);
      const data = await this.uc.getById(id);

      return res.status(200).json({ data });
    } catch (error) {
      return this.handleError(res, error, "Failed to fetch building.");
    }
  };

  create = async (
    req: Request<{}, {}, CreateBuildingDTO & { floors: any }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const { ownerId, managerId } = await this.resolveOwnership(req);

      let calculatedTotalUnits = 0;
      if (req.body.floors) {
        if (Array.isArray(req.body.floors)) {
          calculatedTotalUnits = req.body.floors.reduce(
            (sum: number, f: any) =>
              sum +
              Number(
                f.totalUnits ||
                  f.units ||
                  f.numberOfUnits ||
                  (typeof f !== "object" ? f : 0),
              ),
            0,
          );
        } else {
          calculatedTotalUnits = Object.values(req.body.floors).reduce(
            (sum: number, u: any) => sum + Number(u),
            0,
          );
        }
      }

      const requestedTotalUnits = Number(req.body.totalUnits) || 0;

      const payload: CreateBuildingDTO = {
        ...req.body,
        ownerId,
        managerId,
        totalUnits: Math.max(requestedTotalUnits, calculatedTotalUnits),
        totalFloors: Number(Object.keys(req.body.floors || {}).length),
      };

      const data = await this.uc.create(payload);

      let floorData: any[] = [];
      if (Array.isArray(req.body.floors)) {
        floorData = req.body.floors.map((floorItem: any, index: number) => {
          if (typeof floorItem === "object" && floorItem !== null) {
            return {
              buildingId: data._id,
              floorNumber: Number(floorItem.floorNumber ?? index),
              name: floorItem.name || `Floor ${floorItem.floorNumber ?? index}`,
              totalUnits: Number(
                floorItem.totalUnits ||
                  floorItem.units ||
                  floorItem.numberOfUnits ||
                  0,
              ),
            };
          } else {
            return {
              buildingId: data._id,
              floorNumber: index,
              name: `Floor ${index}`,
              totalUnits: Number(floorItem),
            };
          }
        });
      } else {
        floorData = Object.entries(req.body.floors).map(
          ([key, units], index) => {
            const parsedKey = parseInt(key, 10);
            const floorNum = isNaN(parsedKey) ? index : parsedKey;
            return {
              buildingId: data._id,
              floorNumber: floorNum,
              name: isNaN(parsedKey) ? key : `Floor ${floorNum}`,
              totalUnits: Number(units),
            };
          },
        );
      }

      await this.uc.createFloors(floorData, req.user!.userId, req.user!.role);

      const finalBuilding = await this.uc.getById(data._id);

      return res.status(201).json({
        message: "Building created successfully.",
        data: finalBuilding,
      });
    } catch (error) {
      return this.handleError(res, error, "Failed to create building.");
    }
  };

  update = async (
    req: Request<{ id: string }, {}, UpdateBuildingDTO>,
    res: Response,
  ): Promise<Response> => {
    try {
      const id = BuildingController.getSingleParam(req.params.id);
      const data = await this.uc.update(
        id,
        req.body,
        req.user!.userId,
        req.user!.role,
      );

      return res.status(200).json({
        message: "Building updated successfully.",
        data,
      });
    } catch (error) {
      return this.handleError(res, error, "Failed to update building.");
    }
  };

  delete = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const id = BuildingController.getSingleParam(req.params.id);
      await this.uc.delete(id, req.user!.userId, req.user!.role);

      return res.status(200).json({
        message: "Building deleted successfully.",
      });
    } catch (error) {
      return this.handleError(res, error, "Failed to delete building.");
    }
  };
}
