import type { Request, Response } from "express";
import { IDocumentUseCases } from "../../application/interface/document/document-usecase.interface";
import { AppError } from "../../shared/error/app-error";
import { IBuildingAccessUseCase } from "../../application/interface/building/building-access-usecase.interface";

export class DocumentController {
  constructor(
    private readonly documentUseCases: IDocumentUseCases,
    private readonly buildingAccessUc: IBuildingAccessUseCase,
  ) {}

  private async assertBuildingOwnership(
    buildingId: string | undefined,
    userId: string,
    role: string,
  ): Promise<void> {
    return this.buildingAccessUc.assertOwnership(buildingId, userId, role);
  }

  getAll = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { buildingId, tenantId, unitId } = req.query as Record<
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
              .json({ message: "Documents fetched.", count: 0, data: [] });
          const results = await Promise.all(
            allBuildingIds.map((bid) =>
              this.documentUseCases.getAll({
                buildingId: bid,
                tenantId,
                unitId,
              }),
            ),
          );
          const all = results.flat();
          return res.status(200).json({
            message: "Documents fetched.",
            count: all.length,
            data: all,
          });
        }
      }

      const docs = await this.documentUseCases.getAll({
        buildingId,
        tenantId,
        unitId,
      });
      return res.status(200).json({
        message: "Documents fetched.",
        count: docs.length,
        data: docs,
      });
    } catch (err) {
      return this.handleError(res, err, "Failed to fetch documents.");
    }
  };

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const doc = await this.documentUseCases.getById(req.params.id);
      const user = req.user!;
      if (user.role !== "super_admin") {
        await this.assertBuildingOwnership(
          doc.buildingId,
          user.userId,
          user.role,
        );
      }
      return res.status(200).json({ message: "Document fetched.", data: doc });
    } catch (err) {
      return this.handleError(res, err, "Failed to fetch document.");
    }
  };

  create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = req.user!;
      const buildingId = req.body.buildingId;
      if (user.role !== "super_admin" && buildingId) {
        await this.assertBuildingOwnership(buildingId, user.userId, user.role);
      }
      const doc = await this.documentUseCases.create({ ...req.body });
      return res
        .status(201)
        .json({ message: "Document uploaded successfully.", data: doc });
    } catch (err) {
      return this.handleError(res, err, "Failed to upload document.");
    }
  };

  delete = async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<Response> => {
    try {
      const doc = await this.documentUseCases.getById(req.params.id);
      const user = req.user!;
      if (user.role !== "super_admin") {
        await this.assertBuildingOwnership(
          doc.buildingId,
          user.userId,
          user.role,
        );
      }
      await this.documentUseCases.delete(req.params.id);
      return res
        .status(200)
        .json({ message: "Document deleted successfully." });
    } catch (err) {
      return this.handleError(res, err, "Failed to delete document.");
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
