import {
  Notification,
  NotificationType,
  NotificationChannel,
} from "../../../domain/entities/Notification";

export interface SendMultiChannelNotificationDTO {
  userId: string;
  title: string;
  message: string;
  notificationType?: NotificationType;
  channel?: NotificationChannel;
  buildingId?: string;
  tenantId?: string;
  link?: string;
  metadata?: Record<string, any>;
}

export interface INotificationUseCase {
  getUserNotifications(userId: string, role?: string): Promise<Notification[]>;
  getUnreadCount(userId: string, role?: string): Promise<number>;
  markAsRead(notificationId: string): Promise<Notification | null>;
  markAllAsRead(userId: string, role?: string): Promise<void>;
  sendNotification(data: SendMultiChannelNotificationDTO): Promise<void>;
}
