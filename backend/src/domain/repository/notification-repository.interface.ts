import { Notification, ICreateNotification } from "../entities/Notification";

export interface INotificationRepository {
  create(
    data: ICreateNotification & {
      type?: string;
      metadata?: Record<string, any>;
      recipientRole?: string;
    },
  ): Promise<Notification>;
  findByUserId(userId: string, role?: string): Promise<Notification[]>;
  findByRecipientRole(role: string): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  markAsRead(id: string): Promise<Notification | null>;
  markAllAsRead(userId: string, role?: string): Promise<void>;
  countUnread(userId: string, role?: string): Promise<number>;
}
