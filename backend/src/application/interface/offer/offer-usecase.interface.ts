import {
  CreateOfferDTO,
  OfferResponseDTO,
  UpdateOfferDTO,
} from "../../dtos/offer/offer.dto";

export interface IOfferUseCases {
  create(
    data: CreateOfferDTO,
    userId: string,
    role: string,
  ): Promise<OfferResponseDTO>;

  listForOwner(
    requesterId: string,
    requesterRole: string,
    filter: { buildingId?: string; unitId?: string; isActive?: boolean },
    page: number,
    limit: number,
  ): Promise<{
    data: OfferResponseDTO[];
    total: number;
    page: number;
    limit: number;
  }>;

  getById(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<OfferResponseDTO>;

  update(
    id: string,
    data: UpdateOfferDTO,
    requesterId: string,
    requesterRole: string,
  ): Promise<OfferResponseDTO>;

  delete(id: string, requesterId: string, requesterRole: string): Promise<void>;
}
