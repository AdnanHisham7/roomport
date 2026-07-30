import { logger } from "../../shared/logger/logger";
import { Request, Response } from "express";
import { INotificationUseCase } from "../../application/interface/common/notification-usecase.interface";

export class NotificationController {
  constructor(private notificationUseCase: INotificationUseCase) {}

  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const notifications = await this.notificationUseCase.getUserNotifications(
        userId,
        role,
      );
      res.status(200).json({ success: true, data: notifications });
    } catch (error) {
      logger.error("Error fetching notifications:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const count = await this.notificationUseCase.getUnreadCount(userId, role);
      res.status(200).json({ success: true, data: { count } });
    } catch (error) {
      logger.error("Error fetching unread count:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const notification = await this.notificationUseCase.markAsRead(id);
      if (!notification) {
        res
          .status(404)
          .json({ success: false, message: "Notification not found" });
        return;
      }
      res.status(200).json({ success: true, data: notification });
    } catch (error) {
      logger.error("Error marking notification as read:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      await this.notificationUseCase.markAllAsRead(userId, role);
      res
        .status(200)
        .json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      logger.error("Error marking all notifications as read:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const {
        title,
        message,
        notificationType,
        channel,
        buildingId,
        tenantId,
      } = req.body;
      await this.notificationUseCase.sendNotification({
        userId,
        title,
        message,
        notificationType,
        channel,
        buildingId,
        tenantId,
      });
      res
        .status(200)
        .json({
          success: true,
          message: "Test notification triggered successfully!",
        });
    } catch (error) {
      logger.error("Error sending test notification:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}
