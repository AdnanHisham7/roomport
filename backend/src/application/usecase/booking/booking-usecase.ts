import { logger } from "../../../shared/logger/logger";
import { env } from "../../../infrastructure/config/env";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../../shared/error/app-error";
import { IBooking, BookingStatus } from "../../../domain/entities/Booking";
import { IBookingRepository } from "../../../domain/repository/booking-repository.interface";
import { IBuildingRepository } from "../../../domain/repository/building-repository.interface";
import { IUnitRepository } from "../../../domain/repository/unit-repository.interface";
import { IPlatformTransactionRepository } from "../../../domain/repository/platform-transaction-repository.interface";
import { IPlatformSettingRepository } from "../../../domain/repository/platform-setting-repository.interface";
import { IReservedTenantRepository } from "../../../domain/repository/reserved-tenant-repository.interface";
import {
  ActivityLogAction,
  ActivityLogEntityType,
} from "../../../domain/entities/ActivityLog";
import {
  NotificationChannel,
  NotificationType,
} from "../../../domain/entities/Notification";
import { IActivityLogUsecase } from "../activity-log/activity-log-usecase";
import { INotificationUseCase } from "../../interface/common/notification-usecase.interface";
import { IEmailService } from "../../interface/common/email-service-usecase.interface";
import { IRazorpayService } from "../../interface/common/razorpay-service.interface";
import {
  BookingResponseDTO,
  CreateBookingDTO,
  CreateBookingResultDTO,
  VerifyBookingPaymentDTO,
} from "../../dtos/booking/booking.dto";
import { IBookingUseCases } from "../../interface/booking/booking-usecase.interface";

function toResponse(b: IBooking): BookingResponseDTO {
  return {
    _id: b._id!,
    buildingId: b.buildingId,
    unitId: b.unitId,
    ownerId: b.ownerId,
    applicantName: b.applicantName,
    applicantEmail: b.applicantEmail,
    applicantPhone: b.applicantPhone,
    message: b.message,
    paymentMode: b.paymentMode,
    amount: b.amount,
    isPaid: b.isPaid,
    priorityScore: b.priorityScore,
    status: b.status,
    refundStatus: b.refundStatus,
    refundedAt: b.refundedAt,
    commissionRateSnapshot: b.commissionRateSnapshot,
    commissionAmount: b.commissionAmount,
    netAmountForBuilder: b.netAmountForBuilder,
    rejectionReason: b.rejectionReason,
    decidedBy: b.decidedBy,
    decidedAt: b.decidedAt,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export class BookingUseCases implements IBookingUseCases {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly buildingRepo: IBuildingRepository,
    private readonly unitRepo: IUnitRepository,
    private readonly razorpayService: IRazorpayService,
    private readonly notificationUc: INotificationUseCase,
    private readonly emailService: IEmailService,
    private readonly activityLogUc: IActivityLogUsecase,
    private readonly platformTransactionRepo: IPlatformTransactionRepository,
    private readonly platformSettingRepo: IPlatformSettingRepository,
    private readonly reservedTenantRepo: IReservedTenantRepository,
  ) {}

  private async getCommissionRate(): Promise<number> {
    const settings = await this.platformSettingRepo.get();
    const rate = settings.commissionRatePercentage;
    return typeof rate === "number" && rate >= 0 && rate <= 100 ? rate : 10;
  }

  private async recordBookingPaymentLedger(booking: IBooking): Promise<void> {
    const alreadyRecorded = await this.platformTransactionRepo.existsForBooking(
      booking._id!,
      "booking_payment",
    );
    if (alreadyRecorded) return;

    const rate = await this.getCommissionRate();
    const commissionAmount = Math.round(booking.amount * (rate / 100) * 100) / 100;
    const netAmountForBuilder = Math.round((booking.amount - commissionAmount) * 100) / 100;

    await this.bookingRepo.update(booking._id!, {
      commissionRateSnapshot: rate,
      commissionAmount,
      netAmountForBuilder,
    });

    await this.platformTransactionRepo.create({
      bookingId: booking._id!,
      buildingId: booking.buildingId,
      ownerId: booking.ownerId,
      type: "booking_payment",
      grossAmount: booking.amount,
      commissionRateSnapshot: rate,
      commissionAmount,
      builderAmount: netAmountForBuilder,
    });
  }

  private async recordRefundPenaltyLedger(booking: IBooking): Promise<void> {
    const alreadyRecorded = await this.platformTransactionRepo.existsForBooking(
      booking._id!,
      "refund_penalty",
    );
    if (alreadyRecorded) return;

    const commissionAmount = booking.commissionAmount ?? 0;
    const netAmountForBuilder = booking.netAmountForBuilder ?? 0;
    const rate = booking.commissionRateSnapshot ?? (await this.getCommissionRate());

    await this.platformTransactionRepo.create({
      bookingId: booking._id!,
      buildingId: booking.buildingId,
      ownerId: booking.ownerId,
      type: "refund_penalty",
      grossAmount: booking.amount,
      commissionRateSnapshot: rate,
      commissionAmount,
      builderAmount: -(netAmountForBuilder + commissionAmount),
    });
  }

  private async assertAccess(
    booking: IBooking,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    if (requesterRole === "super_admin") return;
    if (booking.ownerId !== requesterId) {
      const building = await this.buildingRepo.findById(booking.buildingId);
      if (
        !building ||
        (building.ownerId !== requesterId && building.managerId !== requesterId)
      ) {
        throw new ForbiddenError("You do not have access to this booking.");
      }
    }
  }

  private notifyApplicant(to: string, subject: string, message: string): void {
    if (!this.emailService.sendNotificationEmail) return;
    this.emailService
      .sendNotificationEmail(to, subject, message)
      .catch((err) => logger.error("Failed to email applicant:", err));
  }

  async create(data: CreateBookingDTO): Promise<CreateBookingResultDTO> {
    if (!data.applicantName?.trim())
      throw new BadRequestError("applicantName is required.");
    if (!data.applicantEmail?.trim())
      throw new BadRequestError("applicantEmail is required.");
    if (!data.buildingId) throw new BadRequestError("buildingId is required.");
    if (!data.unitId) throw new BadRequestError("unitId is required.");
    if (data.paymentMode !== "online" && data.paymentMode !== "offline")
      throw new BadRequestError("paymentMode must be 'online' or 'offline'.");

    const building = await this.buildingRepo.findById(data.buildingId);
    if (!building) throw new NotFoundError("Listing not found.");
    if (!building.isPublished)
      throw new BadRequestError(
        "This listing is not currently accepting bookings.",
      );

    const unit = await this.unitRepo.findById(data.unitId);
    if (!unit || unit.buildingId !== data.buildingId)
      throw new BadRequestError("Invalid room reference.");
    if (unit.status !== "available")
      throw new BadRequestError(
        "This room is no longer available for booking.",
      );

    const amount = unit.tokenAmount ?? 0;
    if (data.paymentMode === "online" && amount <= 0)
      throw new BadRequestError(
        "Online payment is not available for this room.",
      );

    let booking = await this.bookingRepo.create({
      buildingId: data.buildingId,
      unitId: data.unitId,
      ownerId: building.ownerId,
      applicantName: data.applicantName.trim(),
      applicantEmail: data.applicantEmail.trim().toLowerCase(),
      applicantPhone: data.applicantPhone,
      message: data.message,
      paymentMode: data.paymentMode,
      amount,
      isPaid: false,
      priorityScore: 0,
      status: "pending",
      refundStatus: "none",
    });

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BOOKING_CREATED,
        entityType: ActivityLogEntityType.BOOKING,
        entityId: booking._id,
        buildingId: building._id,
        unitId: unit._id,
        userId: building.ownerId,
        description: `${booking.applicantName} applied to book "${building.name}" (${unit.unitNumber}) — ${
          data.paymentMode === "online" ? "online payment initiated" : "pay at property"
        }.`,
        metadata: { paymentMode: data.paymentMode, amount },
      })
      .catch((err) => logger.error(String(err)));

    if (data.paymentMode === "offline") {
      this.notificationUc
        .sendNotification({
          userId: building.ownerId,
          title: "New booking request",
          message: `${booking.applicantName} wants to book "${building.name}" (${unit.unitNumber}). Payment will be collected at the property.`,
          notificationType: NotificationType.GENERAL,
          channel: NotificationChannel.EMAIL,
          buildingId: building._id,
          link: `/dashboard/bookings/${booking._id}`,
        })
        .catch((err) => logger.error("Failed to notify owner:", err));

      this.notifyApplicant(
        booking.applicantEmail,
        "Booking request received",
        `Hi ${booking.applicantName}, your request to book "${building.name}" (${unit.unitNumber}) has been received and is pending review.`,
      );

      return { booking: toResponse(booking) };
    }

    const order = await this.razorpayService.createOrder(
      amount,
      `booking_${booking._id}`,
      { bookingId: booking._id!, unitId: unit._id! },
    );

    booking = (await this.bookingRepo.update(booking._id!, {
      razorpayOrderId: order.id,
    }))!;

    return {
      booking: toResponse(booking),
      razorpayOrder: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: env.RAZORPAY_KEY_ID,
      },
    };
  }

  async verifyPayment(
    data: VerifyBookingPaymentDTO,
  ): Promise<BookingResponseDTO> {
    const booking = await this.bookingRepo.findById(data.bookingId);
    if (!booking) throw new NotFoundError("Booking not found.");
    if (booking.razorpayOrderId !== data.razorpayOrderId)
      throw new BadRequestError("Order reference mismatch.");

    if (booking.isPaid) return toResponse(booking);

    const valid = this.razorpayService.verifyPaymentSignature(
      data.razorpayOrderId,
      data.razorpayPaymentId,
      data.razorpaySignature,
    );
    if (!valid)
      throw new BadRequestError(
        "Payment verification failed.",
        "If money was deducted, it will be auto-refunded by Razorpay. Please contact the property owner.",
      );

    const updated = await this.bookingRepo.update(booking._id!, {
      isPaid: true,
      priorityScore: 100,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
    });

    const finalBooking = await this.onPaymentConfirmed(updated!);
    return toResponse(finalBooking);
  }

  private async onPaymentConfirmed(booking: IBooking): Promise<IBooking> {
    await this.recordBookingPaymentLedger(booking);
    const refreshed = await this.bookingRepo.findById(booking._id!);
    const finalBooking = refreshed ?? booking;

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BOOKING_PAYMENT_RECEIVED,
        entityType: ActivityLogEntityType.BOOKING,
        entityId: finalBooking._id,
        buildingId: finalBooking.buildingId,
        unitId: finalBooking.unitId,
        userId: finalBooking.ownerId,
        description: `Online payment of ₹${finalBooking.amount} received for booking by ${finalBooking.applicantName}.`,
        metadata: { amount: finalBooking.amount },
      })
      .catch((err) => logger.error(String(err)));

    this.notificationUc
      .sendNotification({
        userId: finalBooking.ownerId,
        title: "Booking payment received",
        message: `${finalBooking.applicantName} paid ₹${finalBooking.amount} for a booking. Review the application to confirm or reject it.`,
        notificationType: NotificationType.GENERAL,
        channel: NotificationChannel.EMAIL,
        buildingId: finalBooking.buildingId,
        link: `/dashboard/bookings/${finalBooking._id}`,
      })
      .catch((err) => logger.error("Failed to notify owner:", err));

    this.notifyApplicant(
      finalBooking.applicantEmail,
      "Payment received",
      `Hi ${finalBooking.applicantName}, we've received your payment of ₹${finalBooking.amount}. Your booking is now under review.`,
    );

    return finalBooking;
  }

  async listForOwner(
    requesterId: string,
    requesterRole: string,
    filter: { buildingId?: string; unitId?: string; status?: BookingStatus },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const scopedFilter =
      requesterRole === "super_admin"
        ? filter
        : { ...filter, ownerId: requesterId };
    const { data, total } = await this.bookingRepo.findAllPaginated(
      scopedFilter,
      skip,
      limit,
    );
    return { data: data.map(toResponse), total, page, limit };
  }

  async getById(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<BookingResponseDTO> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) throw new NotFoundError("Booking not found.");
    await this.assertAccess(booking, requesterId, requesterRole);
    return toResponse(booking);
  }

  async confirm(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<BookingResponseDTO> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) throw new NotFoundError("Booking not found.");
    await this.assertAccess(booking, requesterId, requesterRole);
    if (booking.status !== "pending")
      throw new BadRequestError("Only pending bookings can be confirmed.");

    const updated = await this.bookingRepo.update(id, {
      status: "confirmed",
      decidedBy: requesterId,
      decidedAt: new Date(),
    });

    await this.unitRepo.update(booking.unitId, { status: "reserved" });

    await this.reservedTenantRepo.upsertForUnit(booking.unitId, {
      buildingId: booking.buildingId,
      unitId: booking.unitId,
      bookingId: booking._id!,
      ownerId: booking.ownerId,
      name: booking.applicantName,
      email: booking.applicantEmail,
      phone: booking.applicantPhone,
      amount: booking.amount,
      isPaid: booking.isPaid,
      reservedAt: new Date(),
    });

    const otherPending = await this.bookingRepo.findAll({
      unitId: booking.unitId,
      status: "pending",
    });
    for (const other of otherPending) {
      if (other._id === id) continue;
      await this.bookingRepo.update(other._id!, {
        status: "rejected",
        rejectionReason: "This room was allocated to another applicant.",
        decidedBy: requesterId,
        decidedAt: new Date(),
      });
      this.notifyApplicant(
        other.applicantEmail,
        "Booking update",
        `Hi ${other.applicantName}, unfortunately this room has been allocated to another applicant. ${
          other.isPaid
            ? "If you paid online, the property owner will process your refund."
            : ""
        }`,
      );
    }

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BOOKING_CONFIRMED,
        entityType: ActivityLogEntityType.BOOKING,
        entityId: id,
        buildingId: booking.buildingId,
        unitId: booking.unitId,
        userId: requesterId,
        description: `Booking by ${booking.applicantName} confirmed.`,
      })
      .catch((err) => logger.error(String(err)));

    this.notifyApplicant(
      booking.applicantEmail,
      "Booking confirmed!",
      `Hi ${booking.applicantName}, your booking has been confirmed. The property owner will reach out with next steps.`,
    );

    return toResponse(updated!);
  }

  async reject(
    id: string,
    requesterId: string,
    requesterRole: string,
    reason?: string,
  ): Promise<BookingResponseDTO> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) throw new NotFoundError("Booking not found.");
    await this.assertAccess(booking, requesterId, requesterRole);
    if (booking.status !== "pending")
      throw new BadRequestError("Only pending bookings can be rejected.");

    const updated = await this.bookingRepo.update(id, {
      status: "rejected",
      rejectionReason: reason,
      decidedBy: requesterId,
      decidedAt: new Date(),
    });

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BOOKING_REJECTED,
        entityType: ActivityLogEntityType.BOOKING,
        entityId: id,
        buildingId: booking.buildingId,
        unitId: booking.unitId,
        userId: requesterId,
        description: `Booking by ${booking.applicantName} rejected.`,
        metadata: { reason },
      })
      .catch((err) => logger.error(String(err)));

    this.notifyApplicant(
      booking.applicantEmail,
      "Booking update",
      `Hi ${booking.applicantName}, your booking request was not accepted.${
        reason ? ` Reason: ${reason}.` : ""
      }${
        booking.isPaid
          ? " If you paid online, the property owner will process your refund."
          : ""
      }`,
    );

    return toResponse(updated!);
  }

  async refund(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<BookingResponseDTO> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) throw new NotFoundError("Booking not found.");
    await this.assertAccess(booking, requesterId, requesterRole);

    if (booking.paymentMode !== "online" || !booking.isPaid)
      throw new BadRequestError("This booking was not paid online.");
    if (booking.refundStatus === "processed")
      throw new BadRequestError("This booking has already been refunded.");
    if (booking.refundStatus === "initiated")
      throw new BadRequestError("A refund is already in progress.");
    if (!booking.razorpayPaymentId)
      throw new BadRequestError("No payment reference found for this booking.");

    const refund = await this.razorpayService.createRefund(
      booking.razorpayPaymentId,
      booking.amount,
    );

    const updated = await this.bookingRepo.update(id, {
      refundStatus: "initiated",
      refundId: refund.id,
    });

    await this.recordRefundPenaltyLedger(updated!);
    const finalBooking = (await this.bookingRepo.findById(id)) ?? updated!;

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.BOOKING_REFUND_INITIATED,
        entityType: ActivityLogEntityType.BOOKING,
        entityId: id,
        buildingId: booking.buildingId,
        unitId: booking.unitId,
        userId: requesterId,
        description: `Refund of ₹${booking.amount} initiated for booking by ${booking.applicantName}. Commission of ₹${
          booking.commissionAmount ?? 0
        } is retained as a loss on the builder's account.`,
      })
      .catch((err) => logger.error(String(err)));

    this.notifyApplicant(
      booking.applicantEmail,
      "Refund initiated",
      `Hi ${booking.applicantName}, a refund of ₹${booking.amount} has been initiated for your booking. It may take a few business days to reflect.`,
    );

    return toResponse(finalBooking);
  }

  async handleWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
  ): Promise<void> {
    const valid = this.razorpayService.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!valid) throw new BadRequestError("Invalid webhook signature.");

    const event = JSON.parse(rawBody.toString());

    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id) return;
      const booking = await this.bookingRepo.findByRazorpayOrderId(
        payment.order_id,
      );
      if (!booking || booking.isPaid) return;

      const updated = await this.bookingRepo.update(booking._id!, {
        isPaid: true,
        priorityScore: 100,
        razorpayPaymentId: payment.id,
      });
      await this.onPaymentConfirmed(updated!);
      return;
    }

    if (event.event === "refund.processed") {
      const refund = event.payload?.refund?.entity;
      if (!refund?.payment_id) return;
      const booking = await this.bookingRepo.findByRazorpayPaymentId(
        refund.payment_id,
      );
      if (!booking || booking.refundStatus === "processed") return;

      await this.bookingRepo.update(booking._id!, {
        refundStatus: "processed",
        status: "refunded",
        refundedAt: new Date(),
      });

      await this.recordRefundPenaltyLedger(booking);

      this.activityLogUc
        .logActivity({
          action: ActivityLogAction.BOOKING_REFUND_PROCESSED,
          entityType: ActivityLogEntityType.BOOKING,
          entityId: booking._id,
          buildingId: booking.buildingId,
          unitId: booking.unitId,
          userId: booking.ownerId,
          description: `Refund of ₹${booking.amount} processed for booking by ${booking.applicantName}.`,
        })
        .catch((err) => logger.error(String(err)));

      this.notifyApplicant(
        booking.applicantEmail,
        "Refund completed",
        `Hi ${booking.applicantName}, your refund of ₹${booking.amount} has been processed.`,
      );
      return;
    }

    if (event.event === "refund.failed") {
      const refund = event.payload?.refund?.entity;
      if (!refund?.payment_id) return;
      const booking = await this.bookingRepo.findByRazorpayPaymentId(
        refund.payment_id,
      );
      if (!booking) return;

      await this.bookingRepo.update(booking._id!, { refundStatus: "failed" });

      this.notificationUc
        .sendNotification({
          userId: booking.ownerId,
          title: "Refund failed",
          message: `The refund for ${booking.applicantName}'s booking failed. Please retry from the dashboard.`,
          notificationType: NotificationType.GENERAL,
          channel: NotificationChannel.EMAIL,
          buildingId: booking.buildingId,
          link: `/dashboard/bookings/${booking._id}`,
        })
        .catch((err) => logger.error("Failed to notify owner:", err));
    }
  }
}
