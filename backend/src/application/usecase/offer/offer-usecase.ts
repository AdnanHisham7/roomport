import { logger } from "../../../shared/logger/logger";
import { IOfferRepository } from "../../../domain/repository/offer-repository.interface";
import { IUnitRepository } from "../../../domain/repository/unit-repository.interface";
import { IBuildingRepository } from "../../../domain/repository/building-repository.interface";
import {
  BadRequestError,
  NotFoundError,
} from "../../../shared/error/app-error";
import { IBuildingAccessUseCase } from "../../interface/building/building-access-usecase.interface";
import { IActivityLogUsecase } from "../activity-log/activity-log-usecase";
import {
  ActivityLogAction,
  ActivityLogEntityType,
} from "../../../domain/entities/ActivityLog";
import { IOffer, OfferDiscountType } from "../../../domain/entities/Offer";
import {
  CreateOfferDTO,
  OfferResponseDTO,
  UpdateOfferDTO,
} from "../../dtos/offer/offer.dto";
import { IOfferUseCases } from "../../interface/offer/offer-usecase.interface";

const MAX_PERCENTAGE_DISCOUNT = 90;

function toResponse(o: IOffer): OfferResponseDTO {
  return {
    _id: o._id!,
    buildingId: o.buildingId,
    unitId: o.unitId,
    ownerId: o.ownerId,
    title: o.title,
    description: o.description,
    discountType: o.discountType,
    discountValue: o.discountValue,
    startDate: o.startDate,
    endDate: o.endDate,
    isActive: o.isActive,
    createdBy: o.createdBy,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export class OfferUseCases implements IOfferUseCases {
  constructor(
    private readonly offerRepo: IOfferRepository,
    private readonly unitRepo: IUnitRepository,
    private readonly buildingRepo: IBuildingRepository,
    private readonly buildingAccessUc: IBuildingAccessUseCase,
    private readonly activityLogUc: IActivityLogUsecase,
  ) {}

  private validateDiscount(
    discountType: OfferDiscountType,
    discountValue: number,
    rentAmount: number,
  ): void {
    if (discountValue <= 0)
      throw new BadRequestError("discountValue must be greater than 0.");
    if (
      discountType === "percentage" &&
      discountValue > MAX_PERCENTAGE_DISCOUNT
    )
      throw new BadRequestError(
        `Percentage discounts cannot exceed ${MAX_PERCENTAGE_DISCOUNT}%.`,
      );
    if (discountType === "flat" && discountValue >= rentAmount)
      throw new BadRequestError(
        "A flat discount cannot be greater than or equal to the room's rent.",
      );
  }

  private validateDates(startDate: Date, endDate: Date): void {
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
      throw new BadRequestError("Invalid startDate or endDate.");
    if (startDate >= endDate)
      throw new BadRequestError("endDate must be after startDate.");
    if (endDate < new Date())
      throw new BadRequestError("endDate cannot be in the past.");
  }

  async create(
    data: CreateOfferDTO,
    userId: string,
    role: string,
  ): Promise<OfferResponseDTO> {
    if (!data.title?.trim()) throw new BadRequestError("title is required.");
    if (data.discountType !== "percentage" && data.discountType !== "flat")
      throw new BadRequestError("discountType must be 'percentage' or 'flat'.");

    const building = await this.buildingRepo.findById(data.buildingId);
    if (!building) throw new NotFoundError("Building not found.");
    await this.buildingAccessUc.assertOwnership(data.buildingId, userId, role);

    const unit = await this.unitRepo.findById(data.unitId);
    if (!unit || unit.buildingId !== data.buildingId)
      throw new BadRequestError("Invalid room reference.");

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    this.validateDates(startDate, endDate);
    this.validateDiscount(
      data.discountType,
      data.discountValue,
      unit.rentAmount,
    );

    await this.offerRepo.deactivateActiveForUnit(unit._id!);

    const offer = await this.offerRepo.create({
      buildingId: data.buildingId,
      unitId: data.unitId,
      ownerId: building.ownerId,
      title: data.title.trim(),
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      startDate,
      endDate,
      isActive: true,
      createdBy: userId,
    });

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.ROOM_UPDATED,
        entityType: ActivityLogEntityType.ROOM,
        entityId: unit._id,
        buildingId: data.buildingId,
        unitId: unit._id,
        userId,
        description: `Offer "${offer.title}" applied to room ${unit.unitNumber}: ${
          data.discountType === "percentage"
            ? `${data.discountValue}% off`
            : `₹${data.discountValue} off`
        }.`,
      })
      .catch((err) => logger.error(String(err)));

    return toResponse(offer);
  }

  async listForOwner(
    requesterId: string,
    requesterRole: string,
    filter: { buildingId?: string; unitId?: string; isActive?: boolean },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const scopedFilter =
      requesterRole === "super_admin"
        ? filter
        : { ...filter, ownerId: requesterId };
    const { data, total } = await this.offerRepo.findAllPaginated(
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
  ): Promise<OfferResponseDTO> {
    const offer = await this.offerRepo.findById(id);
    if (!offer) throw new NotFoundError("Offer not found.");
    await this.buildingAccessUc.assertOwnership(
      offer.buildingId,
      requesterId,
      requesterRole,
    );
    return toResponse(offer);
  }

  async update(
    id: string,
    data: UpdateOfferDTO,
    requesterId: string,
    requesterRole: string,
  ): Promise<OfferResponseDTO> {
    const existing = await this.offerRepo.findById(id);
    if (!existing) throw new NotFoundError("Offer not found.");
    await this.buildingAccessUc.assertOwnership(
      existing.buildingId,
      requesterId,
      requesterRole,
    );

    const unit = await this.unitRepo.findById(existing.unitId);
    if (!unit) throw new NotFoundError("Room not found.");

    const nextDiscountType = data.discountType ?? existing.discountType;
    const nextDiscountValue = data.discountValue ?? existing.discountValue;
    if (data.discountType || data.discountValue !== undefined) {
      this.validateDiscount(
        nextDiscountType,
        nextDiscountValue,
        unit.rentAmount,
      );
    }

    const nextStart = data.startDate
      ? new Date(data.startDate)
      : existing.startDate;
    const nextEnd = data.endDate ? new Date(data.endDate) : existing.endDate;
    if (data.startDate || data.endDate) {
      this.validateDates(nextStart, nextEnd);
    }

    if (data.isActive === true && !existing.isActive) {
      await this.offerRepo.deactivateActiveForUnit(existing.unitId, id);
    }

    const updated = await this.offerRepo.update(id, {
      ...data,
      startDate: nextStart,
      endDate: nextEnd,
    });

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.ROOM_UPDATED,
        entityType: ActivityLogEntityType.ROOM,
        entityId: existing.unitId,
        buildingId: existing.buildingId,
        unitId: existing.unitId,
        userId: requesterId,
        description: `Offer "${existing.title}" updated.`,
      })
      .catch((err) => logger.error(String(err)));

    return toResponse(updated!);
  }

  async delete(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    const existing = await this.offerRepo.findById(id);
    if (!existing) throw new NotFoundError("Offer not found.");
    await this.buildingAccessUc.assertOwnership(
      existing.buildingId,
      requesterId,
      requesterRole,
    );

    await this.offerRepo.delete(id);

    this.activityLogUc
      .logActivity({
        action: ActivityLogAction.ROOM_UPDATED,
        entityType: ActivityLogEntityType.ROOM,
        entityId: existing.unitId,
        buildingId: existing.buildingId,
        unitId: existing.unitId,
        userId: requesterId,
        description: `Offer "${existing.title}" removed.`,
      })
      .catch((err) => logger.error(String(err)));
  }
}
