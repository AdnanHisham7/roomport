import type { Request, Response } from "express";
import { ITenantUseCases } from "../../application/interface/tenant/tenant-usecase.interface";
import { AppError } from "../../shared/error/app-error";

export class TenantController {
  constructor(private readonly tenantUseCases: ITenantUseCases) {}

  getAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { buildingId, unitId, status } = req.query as Record<
        string,
        string
      >;
      const user = req.user!;
      const scopedUserId =
        user.role === "super_admin" ? undefined : user.userId;
      const tenants = await this.tenantUseCases.getAll({
        buildingId,
        unitId,
        status,
        ownerId: scopedUserId,
      });
      return res.status(200).json({
        message: "Tenants fetched.",
        count: tenants.length,
        data: tenants,
      });
    } catch (err) {
      return this.handleError(res, err, "Failed to fetch tenants.");
    }
  };

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const user = req.user!;
      const scopedUserId =
        user.role === "super_admin" ? undefined : user.userId;
      const tenant = await this.tenantUseCases.getById(
        req.params.id,
        scopedUserId,
      );
      return res.status(200).json({ message: "Tenant fetched.", data: tenant });
    } catch (err) {
      return this.handleError(res, err, "Failed to fetch tenant.");
    }
  };

  createTenant = async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenant = await this.tenantUseCases.create({
        ...req.body,
        createdBy: req.user!.userId,
      });
      return res
        .status(201)
        .json({ message: "Tenant created successfully.", data: tenant });
    } catch (err) {
      return this.handleError(res, err, "Failed to create tenant.");
    }
  };

  updateTenant = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const user = req.user!;
      const scopedUserId =
        user.role === "super_admin" ? undefined : user.userId;
      const tenant = await this.tenantUseCases.update(
        req.params.id,
        req.body,
        scopedUserId,
      );
      return res
        .status(200)
        .json({ message: "Tenant updated successfully.", data: tenant });
    } catch (err) {
      return this.handleError(res, err, "Failed to update tenant.");
    }
  };

  deleteTenant = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const user = req.user!;
      const scopedUserId =
        user.role === "super_admin" ? undefined : user.userId;
      await this.tenantUseCases.delete(req.params.id, scopedUserId);
      return res.status(200).json({ message: "Tenant deleted successfully." });
    } catch (err) {
      return this.handleError(res, err, "Failed to delete tenant.");
    }
  };

  getTenantLeases = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const leases = await this.tenantUseCases.getTenantLeases(req.params.id);
      return res
        .status(200)
        .json({ message: "Tenant leases fetched.", data: leases });
    } catch (err) {
      return this.handleError(res, err, "Failed to fetch tenant leases.");
    }
  };

  transferTenant = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const { targetUnitId } = req.body;
      const user = req.user!;
      const scopedUserId =
        user.role === "super_admin" ? undefined : user.userId;
      const result = await this.tenantUseCases.transferTenant(
        req.params.id,
        targetUnitId,
        user.userId,
        scopedUserId,
      );
      return res
        .status(200)
        .json({ message: result.message, data: result.tenant });
    } catch (err) {
      return this.handleError(res, err, "Failed to transfer tenant.");
    }
  };

  setPortalAccess = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const { enabled } = req.body as { enabled: boolean };
      const user = req.user!;
      const scopedUserId =
        user.role === "super_admin" ? undefined : user.userId;
      const tenant = await this.tenantUseCases.setPortalAccess(
        req.params.id,
        !!enabled,
        scopedUserId,
      );
      return res.status(200).json({
        message: `Tenant portal access ${enabled ? "enabled" : "disabled"}.`,
        data: tenant,
      });
    } catch (err) {
      return this.handleError(res, err, "Failed to update portal access.");
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
    return res.status(500).json({
      message: fallback,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
