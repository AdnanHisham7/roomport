import { Request, Response, NextFunction } from "express";
import { IUnitUseCases } from "../../application/interface/unit/unit-usecase.interface";

export class UnitController {
  constructor(private readonly unitUseCases: IUnitUseCases) {}

  async createUnit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const unit = await this.unitUseCases.create(req.body);
      res.status(201).json({ success: true, data: unit });
    } catch (error) {
      next(error);
    }
  }

  async getAllUnits(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { buildingId, status, isOccupied } = req.query;
      const filter: any = {};
      if (buildingId) filter.buildingId = buildingId as string;
      if (status) filter.status = status as string;
      if (isOccupied !== undefined) filter.isOccupied = isOccupied === "true";

      const units = await this.unitUseCases.getAll(filter);
      res.status(200).json({ success: true, data: units });
    } catch (error) {
      next(error);
    }
  }

  async getUnitById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const unit = await this.unitUseCases.getById(req.params.id as string);
      res.status(200).json({ success: true, data: unit });
    } catch (error) {
      next(error);
    }
  }

  async updateUnit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const unit = await this.unitUseCases.update(
        req.params.id as string,
        req.body,
        req.user!.userId,
        req.user!.role,
      );
      res.status(200).json({ success: true, data: unit });
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdateUnits(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { unitIds, updateData } = req.body;
      if (!Array.isArray(unitIds) || unitIds.length === 0) {
        res
          .status(400)
          .json({
            success: false,
            message: "unitIds array is required and must not be empty",
          });
        return;
      }
      const units = await this.unitUseCases.bulkUpdate(unitIds, updateData);
      res
        .status(200)
        .json({
          success: true,
          message: "Units updated successfully",
          data: units,
        });
    } catch (error) {
      next(error);
    }
  }

  async deleteUnit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await this.unitUseCases.delete(
        req.params.id as string,
        req.user!.userId,
        req.user!.role,
      );
      res
        .status(200)
        .json({ success: true, message: "Unit deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}
