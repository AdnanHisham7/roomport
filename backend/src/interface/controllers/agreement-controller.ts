import type { Request, Response } from "express";
import { IAgreementUseCases } from "../../application/interface/agreement/agreement-usecase.impl";
import { AppError } from "../../shared/error/app-error";
import { IBuildingAccessUseCase } from "../../application/interface/building/building-access-usecase.impl";

export class AgreementController {
  constructor(
    private readonly agreementUseCases: IAgreementUseCases,
    private readonly buildingAccessUc: IBuildingAccessUseCase,
  ) {}

  private async assertBuildingOwnership(
    buildingId: string | undefined,
    userId: string,
    role: string,
  ): Promise<void> {
    return this.buildingAccessUc.assertOwnership(buildingId, userId, role);
  }

  create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const {
        tenantId,
        buildingId,
        unitId,
        title,
        body,
        terms,
        monthlyRent,
        startDate,
        endDate,
      } = req.body;
      const user = req.user!;
      if (user.role !== "super_admin") {
        await this.assertBuildingOwnership(buildingId, user.userId, user.role);
      }
      const agreement = await this.agreementUseCases.create({
        tenantId,
        buildingId,
        unitId,
        createdBy: user.userId,
        title,
        body,
        terms,
        monthlyRent: Number(monthlyRent),
        startDate,
        endDate,
      });
      return res
        .status(201)
        .json({ message: "Agreement draft created.", data: agreement });
    } catch (err) {
      return this.handleError(res, err, "Failed to create agreement.");
    }
  };

  getAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { tenantId, buildingId, status } = req.query as Record<
        string,
        string
      >;
      const user = req.user!;

      if (user.role !== "super_admin") {
        if (buildingId) {
          await this.assertBuildingOwnership(
            buildingId,
            user.userId,
            user.role,
          );
        } else {
          const allBuildingIds =
            await this.buildingAccessUc.getAccessibleBuildingIds(user.userId);
          if (!allBuildingIds.length)
            return res
              .status(200)
              .json({ message: "Agreements fetched.", count: 0, data: [] });
          const results = await Promise.all(
            allBuildingIds.map((bid) =>
              this.agreementUseCases.getAll({
                tenantId,
                buildingId: bid,
                status: status as any,
              }),
            ),
          );
          const all = results.flat();
          return res.status(200).json({
            message: "Agreements fetched.",
            count: all.length,
            data: all,
          });
        }
      }

      const agreements = await this.agreementUseCases.getAll({
        tenantId,
        buildingId,
        status: status as any,
      });
      return res.status(200).json({
        message: "Agreements fetched.",
        count: agreements.length,
        data: agreements,
      });
    } catch (err) {
      return this.handleError(res, err, "Failed to fetch agreements.");
    }
  };

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const agreement = await this.agreementUseCases.getById(req.params.id);
      const user = req.user!;
      if (user.role !== "super_admin") {
        await this.assertBuildingOwnership(
          agreement.buildingId,
          user.userId,
          user.role,
        );
      }
      return res
        .status(200)
        .json({ message: "Agreement fetched.", data: agreement });
    } catch (err) {
      return this.handleError(res, err, "Failed to fetch agreement.");
    }
  };

  sendSigningLink = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const agreement = await this.agreementUseCases.getById(req.params.id);
      const user = req.user!;
      if (user.role !== "super_admin") {
        await this.assertBuildingOwnership(
          agreement.buildingId,
          user.userId,
          user.role,
        );
      }
      const expiresInHours = req.body.expiresInHours
        ? Number(req.body.expiresInHours)
        : 72;
      const result = await this.agreementUseCases.sendSigningLink(
        req.params.id,
        expiresInHours,
      );
      return res
        .status(200)
        .json({ message: result.message, expiresAt: result.expiresAt });
    } catch (err) {
      return this.handleError(res, err, "Failed to send signing link.");
    }
  };

  cancel = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const agreement = await this.agreementUseCases.getById(req.params.id);
      const user = req.user!;
      if (user.role !== "super_admin") {
        await this.assertBuildingOwnership(
          agreement.buildingId,
          user.userId,
          user.role,
        );
      }
      const updated = await this.agreementUseCases.cancel(req.params.id);
      return res
        .status(200)
        .json({ message: "Agreement cancelled.", data: updated });
    } catch (err) {
      return this.handleError(res, err, "Failed to cancel agreement.");
    }
  };

  viewByToken = async (
    req: Request<{ token: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const result = await this.agreementUseCases.viewByToken({
        rawToken: req.params.token,
      });
      return res.status(200).json({ data: result });
    } catch (err) {
      return this.handleError(res, err, "Failed to view agreement.");
    }
  };

  initiateSigning = async (
    req: Request<{ token: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const result = await this.agreementUseCases.initiateSigning({
        rawToken: req.params.token, // ✅ Changed 'token' to 'rawToken'
        ...req.body,
      });
      return res.status(200).json(result);
    } catch (err) {
      console.log("Error in initiateSigning:", err);
      return this.handleError(res, err, "Failed to initiate signing.");
    }
  };

  verifySigningOtp = async (
    req: Request<{ token: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const result = await this.agreementUseCases.verifySigningOtp({
        rawToken: req.params.token, // ✅ Changed 'token' to 'rawToken'
        ...req.body,
      });
      return res.status(200).json(result);
    } catch (err) {
      return this.handleError(res, err, "Failed to verify OTP.");
    }
  };

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
      suggestion: "Please try again later.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
