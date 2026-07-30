import { Request, Response } from "express";
import { IActivityLogUsecase } from "../../application/usecase/activity-log/activity-log-usecase";
import { IBuildingAccessUseCase } from "../../application/interface/building/building-access-usecase.interface";

export class ActivityLogController {
  constructor(
    private activityLogUsecase: IActivityLogUsecase,
    private buildingAccessUc: IBuildingAccessUseCase,
  ) {}

  private async getBuilderBuildingIds(userId: string): Promise<string[]> {
    return this.buildingAccessUc.getAccessibleBuildingIds(userId);
  }

  private async assertBuildingScope(
    req: Request,
    buildingId?: string,
  ): Promise<boolean> {
    const user = req.user!;
    if (user.role === "super_admin") return true;
    if (!buildingId) return false;
    try {
      await this.buildingAccessUc.assertOwnership(
        buildingId,
        user.userId,
        user.role,
      );
      return true;
    } catch {
      return false;
    }
  }

  async logActivity(req: Request, res: Response): Promise<void> {
    try {
      const data = {
        ...req.body,
        userId: req.user!.userId,
        ipAddress: req.ip || req.headers["x-forwarded-for"],
        userAgent: req.headers["user-agent"],
      };

      const activityLog = await this.activityLogUsecase.logActivity(data);
      res.status(201).json({ success: true, data: activityLog });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getActivities(req: Request, res: Response): Promise<void> {
    try {
      const { buildingId, page, limit, ...rest } = req.query as Record<
        string,
        string
      >;
      const user = req.user!;

      if (user.role !== "super_admin") {
        if (buildingId) {
          const allowed = await this.assertBuildingScope(req, buildingId);
          if (!allowed) {
            res.status(403).json({
              success: false,
              message: "You do not have access to this building.",
            });
            return;
          }
          const filter = { ...rest, buildingId };
          const result = await this.activityLogUsecase.getActivitiesPaginated(
            filter as any,
            Number(page) || 1,
            Math.min(Number(limit) || 20, 100),
          );
          res.status(200).json({ success: true, ...result });
          return;
        }

        const buildingIds = await this.getBuilderBuildingIds(user.userId);
        if (!buildingIds.length) {
          res
            .status(200)
            .json({ success: true, data: [], total: 0, page: 1, limit: 20 });
          return;
        }

        const allResults = await Promise.all(
          buildingIds.map((bid) =>
            this.activityLogUsecase.getActivitiesPaginated(
              { ...rest, buildingId: bid } as any,
              1,
              1000,
            ),
          ),
        );

        const merged = allResults
          .flatMap((r) => r.data)
          .sort(
            (a, b) =>
              new Date(b.createdAt!).getTime() -
              new Date(a.createdAt!).getTime(),
          );

        const pg = Number(page) || 1;
        const lim = Math.min(Number(limit) || 20, 100);
        const skip = (pg - 1) * lim;
        const slice = merged.slice(skip, skip + lim);

        res.status(200).json({
          success: true,
          data: slice,
          total: merged.length,
          page: pg,
          limit: lim,
        });
        return;
      }

      const filter = { ...rest, ...(buildingId ? { buildingId } : {}) };
      const result = await this.activityLogUsecase.getActivitiesPaginated(
        filter as any,
        Number(page) || 1,
        Math.min(Number(limit) || 20, 100),
      );
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getActivityById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const activity = await this.activityLogUsecase.getActivityById(
        id as string,
      );
      if (!activity) {
        res
          .status(404)
          .json({ success: false, message: "Activity log not found" });
        return;
      }
      if (req.user!.role !== "super_admin") {
        const allowed = await this.assertBuildingScope(
          req,
          activity.buildingId,
        );
        if (!allowed) {
          res.status(403).json({
            success: false,
            message: "You do not have access to this activity log.",
          });
          return;
        }
      }
      res.status(200).json({ success: true, data: activity });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getActivitiesByBuilding(req: Request, res: Response): Promise<void> {
    try {
      const buildingId = req.params.buildingId as string;
      const allowed = await this.assertBuildingScope(req, buildingId);
      if (!allowed) {
        res.status(403).json({
          success: false,
          message: "You do not have access to this building.",
        });
        return;
      }
      const activities = await this.activityLogUsecase.getActivitiesByBuilding(
        buildingId as string,
      );
      res.status(200).json({ success: true, data: activities });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getActivitiesByUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      if (req.user!.role !== "super_admin" && req.user!.userId !== userId) {
        res.status(403).json({
          success: false,
          message: "You can only view your own activity.",
        });
        return;
      }
      const activities = await this.activityLogUsecase.getActivitiesByUser(
        userId as string,
      );
      res.status(200).json({ success: true, data: activities });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
