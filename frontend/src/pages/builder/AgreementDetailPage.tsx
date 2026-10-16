import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Send, X, Clock, CheckCircle, Eye, ShieldCheck, FileCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AgreementViewer } from '@/components/agreement/AgreementViewer';
import { resolvePdfUrl } from '@/utils/pdfUrl';
import { useGetAgreementByIdQuery, useSendSigningLinkMutation, useCancelAgreementMutation } from '@/store/api/agreementApi';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';

const TIMELINE_STEPS = [
  { status: ['draft'], label: 'Draft created', icon: Clock },
  { status: ['sent', 'viewed', 'otp_sent', 'verified', 'completed'], label: 'Sent for signing', icon: Send },
  { status: ['viewed', 'otp_sent', 'verified', 'completed'], label: 'Viewed by tenant', icon: Eye },
  { status: ['verified', 'completed'], label: 'OTP verified', icon: ShieldCheck },
  { status: ['completed'], label: 'Completed', icon: FileCheck },
];

export default function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, isLoading } = useGetAgreementByIdQuery(id!, { skip: !id });
  const [sendLink, { isLoading: sending }] = useSendSigningLinkMutation();
  const [cancelAgreement, { isLoading: cancelling }] = useCancelAgreementMutation();

  if (isLoading) return <PageLoader />;
  if (!data?.data || !id) return <p className="text-ink-soft">Agreement not found.</p>;
  const a = data.data;

  const onSend = async () => {
    try {
      await sendLink({ id }).unwrap();
      toast.success('Signing link sent to the tenant via email.');
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not send signing link.');
    }
  };

  const onCancel = async () => {
    try {
      await cancelAgreement(id).unwrap();
      toast.success('Agreement cancelled.');
      setCancelOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not cancel agreement.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/dashboard/agreements')} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Agreements
      </button>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{a.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{formatDate(a.startDate)} – {formatDate(a.endDate)} · {formatCurrency(a.monthlyRent)}/mo</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={a.status} />
          {a.status === 'draft' && (
            <Button size="sm" icon={<Send className="size-3.5" />} onClick={onSend} loading={sending}>Send for signing</Button>
          )}
          {!['cancelled', 'completed', 'expired'].includes(a.status) && (
            <Button size="sm" variant="danger" icon={<X className="size-3.5" />} onClick={() => setCancelOpen(true)}>Cancel</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card padding="lg">
            <h3 className="mb-3 font-display text-sm font-semibold text-ink">Agreement Content</h3>
            <AgreementViewer body={a.body} terms={a.terms} maxHeight="450px" />
            {a.typedSignatureName && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-xs font-medium text-ink-faint">Signed as</p>
                <p className="font-display text-lg italic text-ink">{a.typedSignatureName}</p>
              </div>
            )}
          </Card>

          {a.finalPdfUrl && (
            <Card padding="md" className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-sage-600"><CheckCircle className="size-4" /> Agreement completed — PDF ready</div>
              <Button size="sm" variant="subtle" icon={<Download className="size-4" />} onClick={() => window.open(resolvePdfUrl(a.finalPdfUrl), '_blank')}>Download PDF</Button>
            </Card>
          )}
        </div>

        <Card padding="lg">
          <h3 className="mb-4 font-display text-sm font-semibold text-ink">Signing timeline</h3>
          <div className="relative flex flex-col gap-4">
            {TIMELINE_STEPS.map((step, i) => {
              const done = step.status.includes(a.status);
              const Icon = step.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-crimson-500 text-white' : 'bg-paper-dim text-ink-faint'}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 pt-1.5">
                    <p className={`text-[13px] font-medium ${done ? 'text-ink' : 'text-ink-faint'}`}>{step.label}</p>
                    {i === 1 && a.audit?.sentAt && <p className="text-[11px] text-ink-faint">{formatDateTime(a.audit.sentAt)}</p>}
                    {i === 2 && a.audit?.viewedAt && <p className="text-[11px] text-ink-faint">{formatDateTime(a.audit.viewedAt)}</p>}
                    {i === 4 && a.audit?.completedAt && <p className="text-[11px] text-ink-faint">{formatDateTime(a.audit.completedAt)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={onCancel} loading={cancelling} title="Cancel this agreement?" description="The tenant's signing link will become invalid." confirmLabel="Cancel agreement" />
    </div>
  );
}
