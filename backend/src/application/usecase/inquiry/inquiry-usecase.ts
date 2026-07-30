import { logger } from "../../../shared/logger/logger";
import { IInquiryRepository } from "../../../domain/repository/inquiry-repository.interface";
import { IBuildingRepository } from "../../../domain/repository/building-repository.interface";
import { IUnitRepository } from "../../../domain/repository/unit-repository.interface";
import { INotificationUseCase } from "../../interface/common/notification-usecase.interface";
import {
  CreateInquiryDTO,
  InquiryResponseDTO,
} from "../../dtos/inquiry/inquiry.dto";
import { IInquiryUseCases } from "../../interface/inquiry/inquiry-usecase.interface";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../../shared/error/app-error";
import { IInquiry, InquiryStatus } from "../../../domain/entities/Inquiry";
import {
  NotificationChannel,
  NotificationType,
} from "../../../domain/entities/Notification";

function toResponse(i: IInquiry): InquiryResponseDTO {
  return {
    _id: i._id!,
    buildingId: i.buildingId,
    unitId: i.unitId,
    ownerId: i.ownerId,
    name: i.name,
    email: i.email,
    phone: i.phone,
    message: i.message,
    status: i.status,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

export class InquiryUseCases implements IInquiryUseCases {
  constructor(
    private readonly inquiryRepo: IInquiryRepository,
    private readonly buildingRepo: IBuildingRepository,
    private readonly unitRepo: IUnitRepository,
    private readonly notificationUc: INotificationUseCase,
  ) {}

  private async assertAccess(
    inquiry: IInquiry,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    if (requesterRole === "super_admin") return;
    if (inquiry.ownerId !== requesterId) {
      const building = await this.buildingRepo.findById(inquiry.buildingId);
      if (
        !building ||
        (building.ownerId !== requesterId && building.managerId !== requesterId)
      ) {
        throw new ForbiddenError("You do not have access to this inquiry.");
      }
    }
  }

  async create(data: CreateInquiryDTO): Promise<InquiryResponseDTO> {
    if (!data.name?.trim()) throw new BadRequestError("name is required.");
    if (!data.email?.trim()) throw new BadRequestError("email is required.");
    if (!data.buildingId) throw new BadRequestError("buildingId is required.");

    const building = await this.buildingRepo.findById(data.buildingId);
    if (!building) throw new NotFoundError("Listing not found.");
    if (!building.isPublished)
      throw new BadRequestError(
        "This listing is not currently accepting inquiries.",
      );

    let unitDoc: any = null;

    if (data.unitId) {
      const unit = await this.unitRepo.findById(data.unitId);
      if (!unit || unit.buildingId !== data.buildingId)
        throw new BadRequestError("Invalid room reference.");
      unitDoc = unit; // Save reference
    }

    const inquiry = await this.inquiryRepo.create({
      buildingId: data.buildingId,
      unitId: data.unitId,
      ownerId: building.ownerId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone,
      message: data.message,
      status: "new",
    });

    const unitSuffix = unitDoc?.unitNumber ? ` (${unitDoc.unitNumber})` : "";

    this.notificationUc
      .sendNotification({
        userId: building.ownerId,
        title: "New inquiry received",
        message: `${data.name} is interested in "${building.name}"${unitSuffix}.`,
        notificationType: NotificationType.GENERAL,
        channel: NotificationChannel.EMAIL,
        buildingId: building._id,
        link: `/dashboard/inquiries/${inquiry._id}`,
      })
      .catch((err) =>
        logger.error("Failed to notify owner of new inquiry:", err),
      );

    return toResponse(inquiry);
  }

  async listForOwner(
    requesterId: string,
    requesterRole: string,
    filter: { buildingId?: string; status?: InquiryStatus },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const scopedFilter =
      requesterRole === "super_admin"
        ? filter
        : { ...filter, ownerId: requesterId };
    const { data, total } = await this.inquiryRepo.findAllPaginated(
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
  ): Promise<InquiryResponseDTO> {
    const inquiry = await this.inquiryRepo.findById(id);
    if (!inquiry) throw new NotFoundError("Inquiry not found.");
    await this.assertAccess(inquiry, requesterId, requesterRole);
    return toResponse(inquiry);
  }

  async updateStatus(
    id: string,
    status: InquiryStatus,
    requesterId: string,
    requesterRole: string,
  ): Promise<InquiryResponseDTO> {
    const inquiry = await this.inquiryRepo.findById(id);
    if (!inquiry) throw new NotFoundError("Inquiry not found.");
    await this.assertAccess(inquiry, requesterId, requesterRole);

    const updated = await this.inquiryRepo.update(id, { status });
    return toResponse(updated!);
  }

  async delete(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    const inquiry = await this.inquiryRepo.findById(id);
    if (!inquiry) throw new NotFoundError("Inquiry not found.");
    await this.assertAccess(inquiry, requesterId, requesterRole);
    await this.inquiryRepo.delete(id);
  }
}
