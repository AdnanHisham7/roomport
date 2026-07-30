import { IUserRepository } from "../../../domain/repository/user-repository.interface";
import { IPlatformTransactionRepository } from "../../../domain/repository/platform-transaction-repository.interface";
import { IBuilderPayoutRepository } from "../../../domain/repository/builder-payout-repository.interface";
import { IPlatformSettingRepository } from "../../../domain/repository/platform-setting-repository.interface";
import { BadRequestError, NotFoundError } from "../../../shared/error/app-error";
import { IPlatformTransaction } from "../../../domain/entities/PlatformTransaction";
import {
  BuilderBalanceDTO,
  BuilderPayoutResponseDTO,
  MarkPayoutPaidDTO,
  PlatformSummaryDTO,
  PlatformTransactionResponseDTO,
} from "../../dtos/payout/payout.dto";
import { IPayoutUseCases } from "../../interface/payout/payout-usecase.interface";

const DEFAULT_COMMISSION_RATE = 10;

function toTxnResponse(t: IPlatformTransaction): PlatformTransactionResponseDTO {
  return {
    _id: t._id!,
    bookingId: t.bookingId,
    buildingId: t.buildingId,
    ownerId: t.ownerId,
    type: t.type,
    grossAmount: t.grossAmount,
    commissionRateSnapshot: t.commissionRateSnapshot,
    commissionAmount: t.commissionAmount,
    builderAmount: t.builderAmount,
    createdAt: t.createdAt,
  };
}

export class PayoutUseCases implements IPayoutUseCases {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly txnRepo: IPlatformTransactionRepository,
    private readonly payoutRepo: IBuilderPayoutRepository,
    private readonly settingRepo: IPlatformSettingRepository,
  ) {}

  private async buildBalance(builderId: string): Promise<BuilderBalanceDTO> {
    const builder = await this.userRepo.findById(builderId);
    if (!builder) throw new NotFoundError("Builder not found.");

    const [
      { totalCommission, totalBuilderAmount, totalGrossCollected },
      totalPaidOut,
    ] = await Promise.all([
      this.txnRepo.sumByOwner(builderId),
      this.payoutRepo.sumByBuilder(builderId),
    ]);

    return {
      builderId,
      builderName: `${builder.first_name} ${builder.last_name}`,
      builderEmail: builder.email,
      payoutQrCodeUrl: builder.payoutQrCodeUrl,
      totalGrossCollected,
      totalCommission,
      totalOwed: totalBuilderAmount,
      totalPaidOut,
      pendingBalance: totalBuilderAmount - totalPaidOut,
    };
  }

  async getMyBalance(builderId: string): Promise<BuilderBalanceDTO> {
    return this.buildBalance(builderId);
  }

  async getMyTransactions(builderId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const { data, total } = await this.txnRepo.findAllPaginated(
      { ownerId: builderId },
      skip,
      limit,
    );
    return { data: data.map(toTxnResponse), total, page, limit };
  }

  async getAllBuilderBalances(): Promise<BuilderBalanceDTO[]> {
    const { data: admins } = await this.userRepo.findAllPaginated(
      { role: "admin" },
      0,
      1000,
    );
    return Promise.all(admins.map((a) => this.buildBalance(a._id!)));
  }

  async getBuilderBalance(builderId: string): Promise<BuilderBalanceDTO> {
    return this.buildBalance(builderId);
  }

  async getPlatformSummary(): Promise<PlatformSummaryDTO> {
    const [settings, platformTotals, totalPaidOutToBuilders] =
      await Promise.all([
        this.settingRepo.get(),
        this.txnRepo.platformTotals(),
        this.payoutRepo.platformTotalPaidOut(),
      ]);

    const allBalances = await this.sumAllOwed();

    return {
      commissionRatePercentage:
        settings.commissionRatePercentage ?? DEFAULT_COMMISSION_RATE,
      totalGrossVolume: platformTotals.totalGrossVolume,
      totalCommissionEarned: platformTotals.totalCommissionEarned,
      totalPaidOutToBuilders,
      totalPendingPayouts: Math.max(allBalances - totalPaidOutToBuilders, 0),
    };
  }

  private async sumAllOwed(): Promise<number> {
    const sums = await this.txnRepo.sumAllOwners();
    return sums.reduce((acc, s) => acc + s.totalBuilderAmount, 0);
  }

  async markPayoutPaid(
    builderId: string,
    data: MarkPayoutPaidDTO,
    adminId: string,
  ): Promise<BuilderPayoutResponseDTO> {
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestError("amount must be greater than 0.");
    }
    const builder = await this.userRepo.findById(builderId);
    if (!builder) throw new NotFoundError("Builder not found.");

    const payout = await this.payoutRepo.create({
      builderId,
      amount: data.amount,
      markedBy: adminId,
      note: data.note,
    });

    return {
      _id: payout._id!,
      builderId: payout.builderId,
      amount: payout.amount,
      markedBy: payout.markedBy,
      note: payout.note,
      createdAt: payout.createdAt,
    };
  }

  async getAllTransactions(
    filter: { ownerId?: string; buildingId?: string },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const { data, total } = await this.txnRepo.findAllPaginated(
      filter,
      skip,
      limit,
    );
    return { data: data.map(toTxnResponse), total, page, limit };
  }
}
