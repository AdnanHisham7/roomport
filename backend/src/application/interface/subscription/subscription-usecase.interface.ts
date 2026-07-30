import {
  AdminUpdateSubscriptionDTO,
  SubscriptionResponseDTO,
} from "../../dtos/subscription/subscription.dto";

export interface ISubscriptionUseCases {
  // createQuote(userId: string, data: CreateSubscriptionQuoteDTO): Promise<SubscriptionResponseDTO>;
  getMine(userId: string): Promise<SubscriptionResponseDTO | null>;
  getHistory(userId: string): Promise<SubscriptionResponseDTO[]>;
  listAll(
    filter: { userId?: string; status?: string },
    page: number,
    limit: number,
  ): Promise<{
    data: SubscriptionResponseDTO[];
    total: number;
    page: number;
    limit: number;
  }>;
  adminUpdate(
    id: string,
    data: AdminUpdateSubscriptionDTO,
  ): Promise<SubscriptionResponseDTO>;
  getPricing(): Promise<{
    pricePerBuilding: number;
    pricePerUnit: number;
    currency: string;
  }>;
}
