import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ArrowLeft, Mail, Phone, Briefcase, Save, Trash2, FileSignature, Plus,
  CreditCard, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, MonitorSmartphone,
} from 'lucide-react';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/Badge';
import { Avatar, PageLoader } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RecordPaymentModal } from '@/components/payment/RecordPaymentModal';
import { useGetTenantByIdQuery, useUpdateTenantMutation, useDeleteTenantMutation, useSetTenantPortalAccessMutation } from '@/store/api/tenantApi';
import { useGetAgreementsQuery } from '@/store/api/agreementApi';
import { useGetPaymentRecordsQuery } from '@/store/api/paymentRecordApi';
import { formatCurrency, formatDate, titleCase } from '@/utils/format';
import type { PaymentRecord } from '@/types/platform';
import { cn } from '@/utils/cn';

const statusOptions = [
  { value: 'active',      label: 'Active' },
  { value: 'inactive',    label: 'Inactive' },
  { value: 'pending',     label: 'Pending' },
  { value: 'blacklisted', label: 'Blacklisted' },
];

const paymentStatusIcon: Record<string, React.ReactNode> = {
  paid:    <CheckCircle2 className="size-3.5 text-sage-600" />,
  pending: <Clock className="size-3.5 text-amber-500" />,
  overdue: <AlertCircle className="size-3.5 text-crimson-500" />,
  waived:  <CheckCircle2 className="size-3.5 text-ink-faint" />,
};
const paymentStatusClass: Record<string, string> = {
  paid:    'bg-sage-50 text-sage-700',
  pending: 'bg-amber-50 text-amber-700',
  overdue: 'bg-crimson-50 text-crimson-700',
  waived:  'bg-paper-dim text-ink-faint',
};

interface FormValues {
  firstName: string; lastName: string; email: string; phone: string;
  status: string; rentAmount: number; job: string; notes: string;
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [portalConfirmOpen, setPortalConfirmOpen] = useState(false);

  const { data, isLoading }        = useGetTenantByIdQuery(id!, { skip: !id });
  const { data: agreementsData }   = useGetAgreementsQuery({ tenantId: id }, { skip: !id });
  const { data: paymentData }      = useGetPaymentRecordsQuery(id!, { skip: !id });
  const [updateTenant, { isLoading: saving }]   = useUpdateTenantMutation();
  const [deleteTenant, { isLoading: deleting }] = useDeleteTenantMutation();
  const [setPortalAccess, { isLoading: settingPortalAccess }] = useSetTenantPortalAccessMutation();

  const tenant = data?.data;
  const payments: PaymentRecord[] = paymentData?.data ?? [];

  const { register, handleSubmit } = useForm<FormValues>({
    values: tenant ? {
      firstName: tenant.firstName, lastName: tenant.lastName, email: tenant.email,
      phone: tenant.phone, status: tenant.status, rentAmount: tenant.rentAmount,
      job: tenant.job ?? '', notes: tenant.notes ?? '',
    } : undefined,
  });

  if (isLoading) return <PageLoader />;
  if (!tenant || !id) return <p className="text-ink-soft">Tenant not found.</p>;

  const onSubmit = async (values: FormValues) => {
    try {
      await updateTenant({ id, body: { ...values, rentAmount: Number(values.rentAmount) } }).unwrap();
      toast.success('Tenant updated.');
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not update tenant.');
    }
  };

  const onDelete = async () => {
    try {
      await deleteTenant(id).unwrap();
      toast.success('Tenant removed.');
      navigate('/dashboard/tenants');
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not delete tenant.');
    }
  };

  const onTogglePortalAccess = async () => {
    try {
      const enabled = !tenant.portalEnabled;
      await setPortalAccess({ id, enabled }).unwrap();
      toast.success(enabled ? 'Portal access enabled — setup email sent.' : 'Portal access disabled.');
      setPortalConfirmOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not update portal access.');
    }
  };

  const lastPayment = payments[0];
  const paidCount   = payments.filter(p => p.status === 'paid').length;

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/dashboard/tenants')} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Tenants
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar firstName={tenant.firstName} lastName={tenant.lastName} size="lg" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{tenant.firstName} {tenant.lastName}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
              <Mail className="size-3.5" /> {tenant.email}
            </div>
          </div>
        </div>
        <StatusPill status={tenant.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main form */}
        <Card padding="lg" className="lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-semibold text-ink">Tenant details</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" {...register('firstName', { required: true })} />
              <Input label="Last name"  {...register('lastName',  { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Email" type="email" leftIcon={<Mail className="size-4" />}  {...register('email', { required: true })} />
              <Input label="Phone" leftIcon={<Phone className="size-4" />}               {...register('phone', { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Status" options={statusOptions} {...register('status')} />
              <Input  label="Rent amount" type="number" step="0.01" {...register('rentAmount', { valueAsNumber: true })} />
            </div>
            <Input label="Occupation" leftIcon={<Briefcase className="size-4" />} {...register('job')} />
            <Textarea label="Notes" {...register('notes')} />
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" loading={saving} icon={<Save className="size-4" />}>Save changes</Button>
              <Button type="button" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleteOpen(true)}>Remove tenant</Button>
            </div>
          </form>
        </Card>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          {/* Rent summary */}
          <Card padding="lg">
            <p className="text-xs font-medium text-ink-faint">Rent</p>
            <p className="mt-1 font-display text-xl font-semibold text-ink">{formatCurrency(tenant.rentAmount)}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{titleCase(tenant.rentType)} · due day {tenant.dueDate}</p>
          </Card>

          {/* Payment tracking */}
          <Card padding="lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
                <CreditCard className="size-4 text-crimson-500" /> Payments
              </h3>
              <Button size="sm" variant="subtle" onClick={() => setRecordOpen(true)} icon={<Plus className="size-3.5" />}>Record</Button>
            </div>

            {lastPayment ? (
              <div className="mb-3 rounded-lg border border-line px-3 py-2">
                <p className="text-[11px] font-medium text-ink-faint">Last payment</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-ink">{formatCurrency(lastPayment.amount)}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-ink-soft">{lastPayment.periodLabel}</span>
                  <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', paymentStatusClass[lastPayment.status])}>
                    {paymentStatusIcon[lastPayment.status]} {lastPayment.status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mb-3 text-xs text-ink-faint">No payments recorded yet.</p>
            )}

            {/* Payment history collapsible */}
            {payments.length > 0 && (
              <div>
                <button
                  onClick={() => setHistoryOpen(o => !o)}
                  className="flex w-full items-center justify-between text-[12px] font-medium text-ink-soft hover:text-ink"
                >
                  History ({paidCount} paid)
                  {historyOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>

                {historyOpen && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {payments.map(p => (
                      <div key={p._id} className="flex items-center justify-between rounded-lg border border-line/60 px-2.5 py-1.5 text-[11px]">
                        <div>
                          <p className="font-medium text-ink">{p.periodLabel}</p>
                          <p className="text-ink-faint">{formatCurrency(p.amount)}{p.method ? ` · ${p.method.replace('_', ' ')}` : ''}</p>
                        </div>
                        <span className={cn('flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium', paymentStatusClass[p.status])}>
                          {paymentStatusIcon[p.status]} {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Agreements */}
          <Card padding="lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
                <FileSignature className="size-4 text-crimson-500" /> Agreements
              </h3>
              <Link to="/dashboard/agreements" className="text-xs font-medium text-crimson-600 hover:text-crimson-700">
                <Plus className="size-3.5" />
              </Link>
            </div>
            {!agreementsData?.data.length ? (
              <p className="text-xs text-ink-faint">No agreements yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {agreementsData.data.map(a => (
                  <Link key={a._id} to={`/dashboard/agreements/${a._id}`} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs hover:border-crimson-200">
                    <span className="text-ink-soft">{formatDate(a.startDate)} – {formatDate(a.endDate)}</span>
                    <StatusPill status={a.status} />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Tenant Portal access */}
          <Card padding="lg">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
                <MonitorSmartphone className="size-4 text-crimson-500" /> Tenant Portal
              </h3>
              <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-semibold', tenant.portalEnabled ? 'bg-sage-50 text-sage-600' : 'bg-paper-dim text-ink-faint')}>
                {tenant.portalEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="mb-3 text-xs text-ink-faint">
              {tenant.portalEnabled
                ? 'This tenant can log in to view their dues, payments, and documents.'
                : 'Enable to let this tenant log in and view their dues, payments, and documents.'}
            </p>
            <Button
              size="sm"
              variant={tenant.portalEnabled ? 'outline' : 'primary'}
              loading={settingPortalAccess}
              onClick={() => setPortalConfirmOpen(true)}
              className="w-full justify-center"
            >
              {tenant.portalEnabled ? 'Disable portal access' : 'Enable portal access'}
            </Button>
          </Card>
        </div>
      </div>

      {/* Record payment modal */}
      {tenant && (
        <RecordPaymentModal
          open={recordOpen}
          onClose={() => setRecordOpen(false)}
          tenant={tenant}
        />
      )}

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={onDelete} loading={deleting} title="Remove this tenant?" description="This won't delete their lease history." confirmLabel="Remove tenant" />

      <ConfirmDialog
        open={portalConfirmOpen}
        onClose={() => setPortalConfirmOpen(false)}
        onConfirm={onTogglePortalAccess}
        loading={settingPortalAccess}
        title={tenant.portalEnabled ? 'Disable tenant portal access?' : 'Enable tenant portal access?'}
        description={
          tenant.portalEnabled
            ? `${tenant.firstName} will no longer be able to log in to their tenant portal.`
            : `${tenant.firstName} will receive an email with a link to set up their tenant portal password.`
        }
        confirmLabel={tenant.portalEnabled ? 'Disable access' : 'Enable access'}
      />
    </div>

  );
}
