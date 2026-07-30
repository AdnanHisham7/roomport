import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { IndianRupee, TrendingUp, HandCoins, Percent, QrCode, Send } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import {
  useGetPlatformSummaryQuery,
  useGetAllBuilderBalancesQuery,
  useMarkPayoutPaidMutation,
  type BuilderBalance,
} from '@/store/api/payoutApi';
import { formatCurrency } from '@/utils/format';

interface MarkPaidForm {
  amount: number;
  note: string;
}

export default function PayoutsPage() {
  const [payTarget, setPayTarget] = useState<BuilderBalance | null>(null);

  const { data: summaryData, isLoading: loadingSummary } = useGetPlatformSummaryQuery();
  const { data: balancesData, isLoading: loadingBalances } = useGetAllBuilderBalancesQuery();
  const [markPaid, { isLoading: paying }] = useMarkPayoutPaidMutation();

  const summary = summaryData?.data;
  const balances = [...(balancesData?.data ?? [])].sort((a, b) => b.pendingBalance - a.pendingBalance);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MarkPaidForm>();

  const openPayModal = (builder: BuilderBalance) => {
    setPayTarget(builder);
    reset({ amount: Math.max(builder.pendingBalance, 0), note: '' });
  };

  const onMarkPaid = async (values: MarkPaidForm) => {
    if (!payTarget) return;
    try {
      await markPaid({ builderId: payTarget.builderId, amount: Number(values.amount), note: values.note || undefined }).unwrap();
      toast.success(`Marked ${formatCurrency(values.amount)} as paid to ${payTarget.builderName}.`);
      setPayTarget(null);
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not record payout.');
    }
  };

  if (loadingSummary) return <PageLoader />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Payouts</h1>
        <p className="mt-1 text-sm text-ink-soft">Platform commission earnings and what's owed to each builder.</p>
      </div>

      {summary && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card padding="lg">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint"><Percent className="size-3.5" /> Commission rate</p>
            <p className="mt-1.5 font-display text-2xl font-semibold text-ink">{summary.commissionRatePercentage}%</p>
          </Card>
          <Card padding="lg">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint"><IndianRupee className="size-3.5" /> Gross volume</p>
            <p className="mt-1.5 font-display text-2xl font-semibold text-ink">{formatCurrency(summary.totalGrossVolume)}</p>
          </Card>
          <Card padding="lg" className="border-sage-200 bg-sage-50/40">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-sage-700"><TrendingUp className="size-3.5" /> Platform earned</p>
            <p className="mt-1.5 font-display text-2xl font-semibold text-sage-700">{formatCurrency(summary.totalCommissionEarned)}</p>
          </Card>
          <Card padding="lg">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint"><HandCoins className="size-3.5" /> Paid to builders</p>
            <p className="mt-1.5 font-display text-2xl font-semibold text-ink">{formatCurrency(summary.totalPaidOutToBuilders)}</p>
          </Card>
          <Card padding="lg" className="border-amber-200 bg-amber-50/40">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-700"><HandCoins className="size-3.5" /> Pending payouts</p>
            <p className="mt-1.5 font-display text-2xl font-semibold text-amber-700">{formatCurrency(summary.totalPendingPayouts)}</p>
          </Card>
        </div>
      )}

      <Card padding="none">
        {loadingBalances && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        {!loadingBalances && !balances.length && (
          <EmptyState title="No builder activity yet" description="Builder balances will appear here once bookings start getting paid online." />
        )}
        <div className="divide-y divide-line">
          {balances.map((b) => (
            <div key={b.builderId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="font-medium text-ink">{b.builderName}</p>
                <p className="text-xs text-ink-faint">{b.builderEmail}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  Collected {formatCurrency(b.totalGrossCollected)} · Commission {formatCurrency(b.totalCommission)} · Paid out {formatCurrency(b.totalPaidOut)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-ink-faint">Pending</p>
                  <p className={`font-mono text-base font-semibold ${b.pendingBalance < 0 ? 'text-crimson-600' : 'text-ink'}`}>
                    {formatCurrency(b.pendingBalance)}
                  </p>
                </div>
                <Button
                  size="sm"
                  icon={<Send className="size-3.5" />}
                  disabled={b.pendingBalance <= 0}
                  onClick={() => openPayModal(b)}
                >
                  Mark paid
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Pay ${payTarget?.builderName ?? ''}`}>
        {payTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              Scan the QR code below with GPay/UPI to pay {payTarget.builderName}, then enter the amount you sent and mark it as paid.
            </p>
            <div className="flex justify-center">
              {payTarget.payoutQrCodeUrl ? (
                <img src={payTarget.payoutQrCodeUrl} alt="Payout QR code" className="size-48 rounded-xl border border-line object-cover" />
              ) : (
                <div className="flex size-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-ink-faint">
                  <QrCode className="size-8" />
                  <span className="text-xs">No QR code uploaded yet</span>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit(onMarkPaid)} className="flex flex-col gap-3">
              <Input
                label="Amount paid"
                type="number"
                step="0.01"
                min={0.01}
                leftIcon={<IndianRupee className="size-4" />}
                error={errors.amount?.message}
                {...register('amount', { required: 'Amount is required', valueAsNumber: true, min: { value: 0.01, message: 'Amount must be greater than 0' } })}
              />
              <Input label="Note (optional)" placeholder="e.g. UPI ref number" {...register('note')} />
              <Button type="submit" loading={paying} className="justify-center">Mark as paid</Button>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
