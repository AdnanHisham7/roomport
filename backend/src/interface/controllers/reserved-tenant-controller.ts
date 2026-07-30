import type { Request, Response } from "express";
import { AppError } from "../../shared/error/app-error";
import { IReservedTenantUseCases } from "../../application/interface/reserved-tenant/reserved-tenant-usecase.impl";

export class ReservedTenantController {
  constructor(
    private readonly reservedTenantUseCases: IReservedTenantUseCases,
  ) {}

  getByUnit = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const reserved = await this.reservedTenantUseCases.getByUnit(
        req.params.unitId as string,
        user.userId,
        user.role,
      );
      return res.status(200).json({ data: reserved });
    } catch (e) {
      if (e instanceof AppError)
        return res
          .status(e.statusCode)
          .json({ message: e.message, suggestion: e.suggestion });
      return res
        .status(500)
        .json({ message: "Failed to fetch reserved tenant." });
    }
  };
}
