import { CalendarClock, IndianRupee, FileText, FileSignature, BedDouble, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { resolvePdfUrl } from '@/utils/pdfUrl';
import { useGetTenantDashboardQuery } from '@/store/api/tenantPortalApi';
import { formatCurrency, formatDate } from '@/utils/format';

export default function TenantDashboardPage() {
  const { data, isLoading } = useGetTenantDashboardQuery();

  if (isLoading) return <PageLoader />;
  if (!data?.data) return <EmptyState title="Could not load your dashboard" description="Please try refreshing the page." />;

  const { profile, dueSummary, paymentHistory, agreement, documents } = data.data;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Hi, {profile.firstName} 👋</h1>
        <p className="mt-1 text-sm text-ink-soft">Here's what's happening with your room.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Current period</p>
              <p className="mt-1 font-display text-lg font-semibold text-ink">{dueSummary.currentPeriodLabel}</p>
            </div>
            {dueSummary.isPaidForCurrentPeriod ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-50 px-3 py-1 text-xs font-semibold text-sage-600">
                <CheckCircle2 className="size-3.5" /> Paid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-crimson-50 px-3 py-1 text-xs font-semibold text-crimson-600">
                <AlertCircle className="size-3.5" /> Due
              </span>
            )}
          </div>
          <p className="mt-4 font-display text-3xl font-semibold text-ink">{formatCurrency(dueSummary.amountDue)}</p>
          <p className="mt-1 text-xs text-ink-faint">
            {formatDate(dueSummary.currentPeriodStart)} – {formatDate(dueSummary.currentPeriodEnd)}
            {dueSummary.lastPaymentDate && ` · Last paid ${formatDate(dueSummary.lastPaymentDate)}`}
          </p>
        </Card>

        <Card padding="lg">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Your room</p>
          <p className="mt-1.5 flex items-center gap-1.5 font-display text-base font-semibold text-ink">
            <BedDouble className="size-4 text-crimson-500" /> {profile.unit?.unitNumber ?? '—'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <MapPin className="size-3.5" /> {profile.building?.name}
          </p>
          <p className="mt-1 text-xs text-ink-faint">{profile.building?.address}, {profile.building?.city}</p>
          <div className="mt-3">
            <StatusPill status={profile.status} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card padding="lg">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
            <IndianRupee className="size-4 text-crimson-500" /> Payment history
          </h3>
          {!paymentHistory.length ? (
            <EmptyState title="No payments recorded yet" />
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {paymentHistory.map((p) => (
                <div key={p._id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{p.periodLabel}</p>
                    <p className="text-xs text-ink-faint">{p.paidAt ? formatDate(p.paidAt) : 'Not yet paid'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{formatCurrency(p.amount)}</span>
                    <StatusPill status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card padding="lg">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink">
              <FileSignature className="size-4 text-crimson-500" /> Agreement
            </h3>
            {!agreement ? (
              <p className="text-sm text-ink-faint">No agreement on file yet.</p>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-soft">{formatDate(agreement.startDate)} – {formatDate(agreement.endDate)}</p>
                  <p className="text-xs text-ink-faint">{formatCurrency(agreement.monthlyRent)}/mo</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={agreement.status} />
                  {agreement.finalPdfUrl && (
                    <a href={resolvePdfUrl(agreement.finalPdfUrl)} target="_blank" rel="noreferrer" className="text-xs font-medium text-crimson-600 hover:underline">
                      View PDF
                    </a>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card padding="lg">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink">
              <FileText className="size-4 text-crimson-500" /> Documents
            </h3>
            {!documents.length ? (
              <p className="text-sm text-ink-faint">No documents shared yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-line">
                {documents.map((d) => (
                  <a key={d._id} href={resolvePdfUrl(d.fileUrl)} target="_blank" rel="noreferrer" className="flex items-center justify-between py-2 text-sm text-ink-soft hover:text-crimson-600">
                    <span className="truncate">{d.title}</span>
                    {d.expiryDate && <span className="flex items-center gap-1 text-xs text-ink-faint"><CalendarClock className="size-3" /> {formatDate(d.expiryDate)}</span>}
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
