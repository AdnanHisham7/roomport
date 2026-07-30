import { IndianRupee, TrendingUp, Wallet, HandCoins, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useGetMyBalanceQuery, useGetMyTransactionsQuery } from '@/store/api/payoutApi';
import { formatCurrency, formatDateTime } from '@/utils/format';

export default function TransactionsPage() {
  const { data: balanceData, isLoading: loadingBalance } = useGetMyBalanceQuery();
  const { data: txnData, isLoading: loadingTxns } = useGetMyTransactionsQuery({ page: 1, limit: 50 });

  const balance = balanceData?.data;
  const transactions = txnData?.data ?? [];

  if (loadingBalance) return <PageLoader />;
  if (!balance) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Transactions</h1>
        <p className="mt-1 text-sm text-ink-soft">Token payments collected through your public listings, and what the platform owes you.</p>
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        The platform retains a commission on every online booking payment collected through your listings. Refunding a paid booking does not return that commission — it's marked as a loss on your account.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="lg">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint"><IndianRupee className="size-3.5" /> Collected</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-ink">{formatCurrency(balance.totalGrossCollected)}</p>
        </Card>
        <Card padding="lg">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint"><TrendingUp className="size-3.5" /> Platform commission</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-ink">{formatCurrency(balance.totalCommission)}</p>
        </Card>
        <Card padding="lg">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint"><Wallet className="size-3.5" /> You're owed</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-ink">{formatCurrency(balance.totalOwed)}</p>
        </Card>
        <Card padding="lg" className="border-sage-200 bg-sage-50/40">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-sage-700"><HandCoins className="size-3.5" /> Pending payout</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-sage-700">{formatCurrency(balance.pendingBalance)}</p>
          <p className="mt-1 text-[11px] text-sage-600">{formatCurrency(balance.totalPaidOut)} already paid to you</p>
        </Card>
      </div>

      <Card padding="none" className="mt-5">
        {loadingTxns && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        {!loadingTxns && !transactions.length && (
          <EmptyState title="No transactions yet" description="Paid bookings and refunds on your buildings will show up here." />
        )}
        <div className="divide-y divide-line">
          {transactions.map((t) => (
            <div key={t._id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div>
                <p className="text-sm font-medium text-ink">
                  {t.type === 'booking_payment' ? 'Booking payment received' : 'Refund — commission retained'}
                </p>
                <p className="text-xs text-ink-faint">
                  Gross {formatCurrency(t.grossAmount)} · {t.commissionRateSnapshot}% commission ({formatCurrency(t.commissionAmount)}) · {formatDateTime(t.createdAt)}
                </p>
              </div>
              <span className={`font-mono text-sm font-semibold ${t.builderAmount < 0 ? 'text-crimson-600' : 'text-sage-600'}`}>
                {t.builderAmount < 0 ? '-' : '+'}{formatCurrency(Math.abs(t.builderAmount))}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
