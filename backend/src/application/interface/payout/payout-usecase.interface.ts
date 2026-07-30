import {
  BuilderBalanceDTO,
  BuilderPayoutResponseDTO,
  MarkPayoutPaidDTO,
  PlatformSummaryDTO,
  PlatformTransactionResponseDTO,
} from "../../dtos/payout/payout.dto";

export interface IPayoutUseCases {
  getMyBalance(builderId: string): Promise<BuilderBalanceDTO>;

  getMyTransactions(
    builderId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: PlatformTransactionResponseDTO[];
    total: number;
    page: number;
    limit: number;
  }>;

  getAllBuilderBalances(): Promise<BuilderBalanceDTO[]>;

  getBuilderBalance(builderId: string): Promise<BuilderBalanceDTO>;

  getPlatformSummary(): Promise<PlatformSummaryDTO>;

  markPayoutPaid(
    builderId: string,
    data: MarkPayoutPaidDTO,
    adminId: string,
  ): Promise<BuilderPayoutResponseDTO>;

  getAllTransactions(
    filter: { ownerId?: string; buildingId?: string },
    page: number,
    limit: number,
  ): Promise<{
    data: PlatformTransactionResponseDTO[];
    total: number;
    page: number;
    limit: number;
  }>;
}
