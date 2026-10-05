import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarCheck, ShieldCheck, Wallet, Check, X, RotateCcw } from 'lucide-react';
import { Button, Textarea } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AssignTenantModal } from '@/components/building/AssignTenantModal';
import { useLazyGetUnitByIdQuery } from '@/store/api/unitApi';
import {
  useGetBookingsQuery,
  useConfirmBookingMutation,
  useRejectBookingMutation,
  useRefundBookingMutation,
} from '@/store/api/bookingApi';
import { useGetBuildingsQuery } from '@/store/api/buildingApi';
import { formatCurrency, timeAgo } from '@/utils/format';
import type { Booking } from '@/types/booking';
import type { Unit } from '@/types/building';

export default function BookingsPage() {
  const [confirmTarget, setConfirmTarget] = useState<Booking | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refundTarget, setRefundTarget] = useState<Booking | null>(null);
  const [onboardBooking, setOnboardBooking] = useState<Booking | null>(null);
  const [onboardUnit, setOnboardUnit] = useState<Unit | null>(null);

  const { data, isLoading } = useGetBookingsQuery();
  const { data: buildingsData } = useGetBuildingsQuery();
  const [confirmBooking, { isLoading: confirming }] = useConfirmBookingMutation();
  const [rejectBooking, { isLoading: rejecting }] = useRejectBookingMutation();
  const [refundBooking, { isLoading: refunding }] = useRefundBookingMutation();
  const [fetchUnit] = useLazyGetUnitByIdQuery();

  const buildingNames = new Map((buildingsData?.data ?? []).map((b) => [b._id, b.name]));
  const bookings = [...(data?.data ?? [])].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );

  const onConfirm = async () => {
    if (!confirmTarget) return;
    try {
      await confirmBooking(confirmTarget._id).unwrap();
      toast.success('Booking confirmed. Other pending applicants for this room were auto-rejected.');
      const booking = confirmTarget;
      setConfirmTarget(null);
      try {
        const unitResult = await fetchUnit(booking.unitId).unwrap();
        setOnboardUnit(unitResult.data);
        setOnboardBooking(booking);
      } catch {
        // Non-fatal: builder can still onboard the tenant manually from Tenants later.
      }
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not confirm booking.');
    }
  };

  const onReject = async () => {
    if (!rejectTarget) return;
    try {
      await rejectBooking({ id: rejectTarget._id, reason: rejectReason || undefined }).unwrap();
      toast.success('Booking rejected.');
      setRejectTarget(null);
      setRejectReason('');
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not reject booking.');
    }
  };

  const onRefund = async () => {
    if (!refundTarget) return;
    try {
      await refundBooking(refundTarget._id).unwrap();
      toast.success('Refund initiated with Razorpay.');
      setRefundTarget(null);
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not initiate refund.');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Bookings</h1>
        <p className="mt-1 text-sm text-ink-soft">Review room booking requests — paid applicants are shown first.</p>
        <p className="mt-2 text-xs text-ink-faint">
          The platform retains a commission on every online booking payment. See{' '}
          <Link to="/dashboard/transactions" className="font-medium text-crimson-600 hover:underline">Transactions</Link>{' '}
          for your rate and balance.
        </p>
      </div>

      <Card padding="none">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        {!isLoading && !bookings.length && (
          <EmptyState icon={<CalendarCheck className="size-6" />} title="No booking requests yet" description="Requests from your public listing will appear here." />
        )}
        <div className="divide-y divide-line">
          {bookings.map((b) => (
            <div key={b._id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{b.applicantName}</p>
                  <StatusPill status={b.status} />
                  {b.isPaid ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2 py-0.5 text-[10.5px] font-semibold text-sage-600">
                      <ShieldCheck className="size-3" /> Paid {formatCurrency(b.amount)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-paper-dim px-2 py-0.5 text-[10.5px] font-semibold text-ink-faint">
                      <Wallet className="size-3" /> Pay at property
                    </span>
                  )}
                  {b.refundStatus !== 'none' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-600">
                      Refund: {b.refundStatus}
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-soft">{b.applicantEmail}{b.applicantPhone && ` · ${b.applicantPhone}`}</p>
                <p className="text-xs text-ink-faint">{buildingNames.get(b.buildingId) ?? 'Building'}</p>
                {b.message && <p className="mt-1.5 text-sm text-ink-faint line-clamp-2">{b.message}</p>}
                {b.rejectionReason && <p className="mt-1 text-xs text-crimson-500">Reason: {b.rejectionReason}</p>}
                <p className="mt-1 text-xs text-ink-faint">{timeAgo(b.createdAt)}</p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {b.status === 'pending' && (
                  <>
                    <Button size="sm" variant="subtle" icon={<Check className="size-3.5" />} onClick={() => setConfirmTarget(b)}>Confirm</Button>
                    <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={() => setRejectTarget(b)}>Reject</Button>
                  </>
                )}
                {b.isPaid && b.refundStatus === 'none' && b.status !== 'confirmed' && (
                  <Button size="sm" variant="outline" icon={<RotateCcw className="size-3.5" />} onClick={() => setRefundTarget(b)}>Refund</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={onConfirm}
        title="Confirm this booking?"
        description="This room will be marked as reserved and other pending applicants for it will be automatically rejected."
        confirmLabel="Confirm booking"
        loading={confirming}
      />

      <ConfirmDialog
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        onConfirm={onRefund}
        title="Initiate refund?"
        description={
          refundTarget
            ? `This will refund ${formatCurrency(refundTarget.amount)} to ${refundTarget.applicantName} via Razorpay.${
                refundTarget.commissionAmount
                  ? ` The platform's ${formatCurrency(refundTarget.commissionAmount)} commission on this booking is not returned — that amount will be marked as a loss on your account.`
                  : ''
              }`
            : ''
        }
        confirmLabel="Initiate refund"
        loading={refunding}
      />

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject this booking?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            {rejectTarget?.applicantName} will be notified.
            {rejectTarget?.isPaid ? ' Their payment stays as-is until you initiate a refund separately.' : ''}
          </p>
          <Textarea placeholder="Reason (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={rejecting} onClick={onReject}>Reject booking</Button>
          </div>
        </div>
      </Modal>

      {onboardBooking && onboardUnit && (
        <AssignTenantModal
          open={!!onboardBooking}
          onClose={() => { setOnboardBooking(null); setOnboardUnit(null); }}
          unit={onboardUnit}
          buildingId={onboardBooking.buildingId}
          buildingName={buildingNames.get(onboardBooking.buildingId) ?? 'Building'}
          prefill={{
            firstName: onboardBooking.applicantName.trim().split(' ')[0],
            lastName: onboardBooking.applicantName.trim().split(' ').slice(1).join(' '),
            email: onboardBooking.applicantEmail,
            phone: onboardBooking.applicantPhone,
          }}
        />
      )}
    </div>
  );
}
