import type { Request, Response } from "express";
import { AppError } from "../../shared/error/app-error";
import { ITenantPortalUseCases } from "../../application/interface/tenant-portal/tenant-portal-usecase.interface";

export class TenantPortalController {
  constructor(private readonly tenantPortalUseCases: ITenantPortalUseCases) {}

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

  login = async (req: Request, res: Response): Promise<Response> => {
    try {
      const result = await this.tenantPortalUseCases.login(req.body);
      return res
        .status(200)
        .json({ message: "Login successful.", data: result });
    } catch (e) {
      return this.handleError(res, e, "Failed to log in.");
    }
  };

  setPassword = async (req: Request, res: Response): Promise<Response> => {
    try {
      const result = await this.tenantPortalUseCases.setPassword(req.body);
      return res
        .status(200)
        .json({ message: "Password set successfully.", data: result });
    } catch (e) {
      return this.handleError(res, e, "Failed to set password.");
    }
  };

  getDashboard = async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenant = req.tenant!;
      const dashboard = await this.tenantPortalUseCases.getDashboard(
        tenant.tenantId,
      );
      return res.status(200).json({ data: dashboard });
    } catch (e) {
      return this.handleError(res, e, "Failed to load dashboard.");
    }
  };
}
