import { IBuilderPayout } from "../entities/BuilderPayout";

export interface IBuilderPayoutRepository {
  create(
    data: Omit<IBuilderPayout, "_id" | "createdAt">,
  ): Promise<IBuilderPayout>;

  findByBuilder(builderId: string): Promise<IBuilderPayout[]>;

  sumByBuilder(builderId: string): Promise<number>;

  sumAllBuilders(): Promise<{ builderId: string; total: number }[]>;

  platformTotalPaidOut(): Promise<number>;
}
