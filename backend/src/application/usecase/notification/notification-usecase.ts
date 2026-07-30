import { logger } from "../../../shared/logger/logger";
import {
  Notification,
  NotificationType,
  NotificationChannel,
} from "../../../domain/entities/Notification";
import { INotificationRepository } from "../../../domain/repository/notification-repository.interface";
import {
  INotificationUseCase,
  SendMultiChannelNotificationDTO,
} from "../../interface/common/notification-usecase.interface";
import { IEmailService } from "../../interface/common/email-service-usecase.interface";
import { ISmsService } from "../../interface/common/sms-service.interface";
import { IUserRepository } from "../../../domain/repository/user-repository.interface";

export class NotificationUseCase implements INotificationUseCase {
  constructor(
    private notificationRepository: INotificationRepository,
    private emailService: IEmailService,
    private smsService: ISmsService,
    private userRepository: IUserRepository,
  ) {}

  async getUserNotifications(
    userId: string,
    role?: string,
  ): Promise<Notification[]> {
    return this.notificationRepository.findByUserId(userId, role);
  }

  async getUnreadCount(userId: string, role?: string): Promise<number> {
    return this.notificationRepository.countUnread(userId, role);
  }

  async markAsRead(notificationId: string): Promise<Notification | null> {
    return this.notificationRepository.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string, role?: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId, role);
  }

  async sendNotification(data: SendMultiChannelNotificationDTO): Promise<void> {
    const {
      userId,
      title,
      message,
      notificationType = NotificationType.GENERAL,
      channel = NotificationChannel.IN_APP,
      buildingId,
      tenantId,
      link,
      metadata,
    } = data;

    const promises: Promise<any>[] = [];

    promises.push(
      this.notificationRepository.create({
        userId,
        title,
        message,
        notificationType,
        channel,
        buildingId,
        tenantId,
        metadata: link ? { ...(metadata ?? {}), link } : metadata,
      }),
    );

    if (
      channel === NotificationChannel.EMAIL ||
      channel === NotificationChannel.SMS ||
      channel === NotificationChannel.WHATSAPP
    ) {
      const user = await this.userRepository.findById(userId);
      if (user) {
        if (
          channel === NotificationChannel.EMAIL &&
          user.email &&
          this.emailService.sendNotificationEmail
        ) {
          promises.push(
            this.emailService
              .sendNotificationEmail(user.email, title, message)
              .catch((err) => {
                logger.error("Failed to send email notification:", err);
              }),
          );
        }
        if (channel === NotificationChannel.SMS && user.phone_number) {
          promises.push(
            this.smsService
              .sendSms(user.phone_number, `[${title}]: ${message}`)
              .catch((err) => {
                logger.error("Failed to send SMS notification:", err);
              }),
          );
        }
      }
    }

    await Promise.allSettled(promises);
  }
}
