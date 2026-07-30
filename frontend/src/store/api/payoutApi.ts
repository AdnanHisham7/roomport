import { baseApi } from './baseApi';

export interface BuilderBalance {
  builderId: string;
  builderName: string;
  builderEmail: string;
  payoutQrCodeUrl?: string;
  totalGrossCollected: number;
  totalCommission: number;
  totalOwed: number;
  totalPaidOut: number;
  pendingBalance: number;
}

export interface PlatformSummary {
  commissionRatePercentage: number;
  totalGrossVolume: number;
  totalCommissionEarned: number;
  totalPaidOutToBuilders: number;
  totalPendingPayouts: number;
}

export interface PlatformTransactionEntry {
  _id: string;
  bookingId: string;
  buildingId: string;
  ownerId: string;
  type: 'booking_payment' | 'refund_penalty';
  grossAmount: number;
  commissionRateSnapshot: number;
  commissionAmount: number;
  builderAmount: number;
  createdAt?: string;
}

interface TransactionListResult {
  data: PlatformTransactionEntry[];
  total: number;
  page: number;
  limit: number;
}

export const payoutApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyBalance: builder.query<{ data: BuilderBalance }, void>({
      query: () => '/payouts/me/balance',
      providesTags: ['Payout'],
    }),
    getMyTransactions: builder.query<TransactionListResult, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: '/payouts/me/transactions', params: params ?? undefined }),
      providesTags: ['Payout'],
    }),
    getAllBuilderBalances: builder.query<{ data: BuilderBalance[] }, void>({
      query: () => '/payouts/builders',
      providesTags: ['Payout'],
    }),
    getBuilderBalance: builder.query<{ data: BuilderBalance }, string>({
      query: (builderId) => `/payouts/builders/${builderId}`,
      providesTags: ['Payout'],
    }),
    getPlatformSummary: builder.query<{ data: PlatformSummary }, void>({
      query: () => '/payouts/summary',
      providesTags: ['Payout'],
    }),
    markPayoutPaid: builder.mutation<{ message: string }, { builderId: string; amount: number; note?: string }>({
      query: ({ builderId, ...body }) => ({
        url: `/payouts/builders/${builderId}/mark-paid`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payout'],
    }),
    getAllTransactions: builder.query<TransactionListResult, { ownerId?: string; buildingId?: string; page?: number; limit?: number } | void>({
      query: (params) => ({ url: '/payouts/transactions', params: params ?? undefined }),
      providesTags: ['Payout'],
    }),
  }),
});

export const {
  useGetMyBalanceQuery,
  useGetMyTransactionsQuery,
  useGetAllBuilderBalancesQuery,
  useGetBuilderBalanceQuery,
  useGetPlatformSummaryQuery,
  useMarkPayoutPaidMutation,
  useGetAllTransactionsQuery,
} = payoutApi;
