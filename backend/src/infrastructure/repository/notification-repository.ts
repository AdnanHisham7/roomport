import {
  Notification,
  NotificationType,
  NotificationChannel,
  ICreateNotification,
} from "../../domain/entities/Notification";
import { INotificationRepository } from "../../domain/repository/notification-repository.interface";
import { NotificationModel } from "../db/model/notification-model";

export class NotificationRepositoryImpl implements INotificationRepository {
  private mapToEntity(doc: any): Notification {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return new Notification(
      obj._id.toString(),
      obj.userId?.toString() ?? obj.recipientId?.toString() ?? "",
      obj.title,
      obj.message,
      obj.notificationType as NotificationType,
      obj.channel as NotificationChannel,
      obj.isRead,
      obj.buildingId?.toString(),
      obj.tenantId?.toString(),
      obj.readAt,
      obj.createdAt,
      obj.updatedAt,
      obj.type,
      obj.metadata,
      obj.recipientRole,
    );
  }

  async create(
    data: ICreateNotification & {
      type?: string;
      metadata?: Record<string, any>;
      recipientRole?: string;
    },
  ): Promise<Notification> {
    const created = await NotificationModel.create(data);
    return this.mapToEntity(created);
  }

  /**
   * Finds notifications for a user.
   * If the user has a role (passed as second param), also includes role-broadcast notifications.
   */
  async findByUserId(userId: string, role?: string): Promise<Notification[]> {
    const conditions: any[] = [{ userId }];
    if (role) {
      conditions.push({ recipientRole: role, userId: null });
      conditions.push({ recipientRole: role, userId: { $exists: false } });
    }
    const notifications = await NotificationModel.find({ $or: conditions })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return notifications.map((n) => this.mapToEntity(n));
  }

  async findByRecipientRole(role: string): Promise<Notification[]> {
    const notifications = await NotificationModel.find({ recipientRole: role })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return notifications.map((n) => this.mapToEntity(n));
  }

  async findById(id: string): Promise<Notification | null> {
    const notification = await NotificationModel.findById(id).lean();
    return notification ? this.mapToEntity(notification) : null;
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const notification = await NotificationModel.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true },
    ).lean();
    return notification ? this.mapToEntity(notification) : null;
  }

  async markAllAsRead(userId: string, role?: string): Promise<void> {
    const conditions: any[] = [{ userId }];
    if (role) {
      conditions.push({ recipientRole: role, userId: null });
      conditions.push({ recipientRole: role, userId: { $exists: false } });
    }
    await NotificationModel.updateMany(
      { $or: conditions },
      { isRead: true, readAt: new Date() },
    );
  }

  async countUnread(userId: string, role?: string): Promise<number> {
    const conditions: any[] = [{ userId, isRead: false }];
    if (role) {
      conditions.push({ recipientRole: role, isRead: false, userId: null });
      conditions.push({
        recipientRole: role,
        isRead: false,
        userId: { $exists: false },
      });
    }
    return NotificationModel.countDocuments({ $or: conditions });
  }
}
