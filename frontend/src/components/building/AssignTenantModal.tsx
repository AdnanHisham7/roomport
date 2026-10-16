/**
 * AssignTenantModal — triggered when clicking "assign tenant" on a room tile.
 *
 * Step 1: Collect tenant details
 * Step 2: Choose agreement type + dates — dates are VALIDATED before any backend call
 * Step 3: On confirm → create tenant (with agreementStartDate/agreementEndDate pre-validation) + agreement → mark room occupied
 *
 * Key fix: agreement end date must be after start date. This is validated at Step 2 before
 * the tenant is ever created, so no orphan tenant records can exist.
 */
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import {
  User, Mail, Phone, IndianRupee, Briefcase, FileText, Calendar,
  ChevronRight, ChevronLeft, CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea, RichTextEditor } from '@/components/ui';
import { useCreateTenantMutation } from '@/store/api/tenantApi';
import { useCreateAgreementMutation } from '@/store/api/agreementApi';
import { useUpdateUnitMutation } from '@/store/api/unitApi';
import type { Unit } from '@/types/building';

interface TenantFormValues {
  firstName:  string;
  lastName:   string;
  email:      string;
  phone:      string;
  job:        string;
  notes:      string;
  rentType:   string;
  rentAmount: number;
  dueDate:    number;
}

type AgreementKind = 'rental' | 'lease';

interface AgreementFormValues {
  kind:      AgreementKind;
  startDate: string;
  endDate:   string;
  title:     string;
  body:      string;
  terms:     string;
}

const rentTypeOptions = [
  { value: 'monthly',     label: 'Monthly' },
  { value: 'quarterly',   label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'yearly',      label: 'Yearly' },
  { value: 'custom',      label: 'Custom' },
];

const kindOptions = [
  { value: 'rental', label: 'Rental  (recurring payments per cycle)' },
  { value: 'lease',  label: 'Lease   (single lump-sum for the period)' },
];

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function buildDefaultBody(kind: AgreementKind, tenant: TenantFormValues, unit: Unit, buildingName: string): string {
  const cycleLabel: Record<string, string> = {
    monthly: 'month', quarterly: 'quarter', half_yearly: 'half-year', yearly: 'year', custom: 'period',
  };
  if (kind === 'rental') {
    return `<h2>Rental Agreement Terms</h2>
<p>This Rental Agreement is entered into between the property owner (<strong>"Landlord"</strong>) and <strong>${tenant.firstName} ${tenant.lastName}</strong> (<strong>"Tenant"</strong>) for <u>Unit ${unit.unitNumber}, ${buildingName}</u>.</p>

<h3>1. Rent &amp; Payment Schedule</h3>
<p>The Tenant agrees to pay a recurring rent of <strong>₹${tenant.rentAmount}</strong> per <strong>${cycleLabel[tenant.rentType] ?? 'period'}</strong>, due on the <strong>${tenant.dueDate}${ordinal(tenant.dueDate)}</strong> of each period. Rent must be paid in full and on time. Late payments may incur an agreed penalty.</p>

<h3>2. Premises Maintenance &amp; Subletting</h3>
<p>The Tenant shall maintain the premises in good and clean condition and <u>shall not sublet</u> without the prior written consent of the Landlord.</p>

<h3>3. Security &amp; General Conduct</h3>
<p>The Tenant agrees to respect community guidelines, keep noise levels reasonable, and avoid causing disturbance to neighboring occupants.</p>`;
  }
  return `<h2>Lease Agreement Terms</h2>
<p>This Lease Agreement is entered into between the property owner (<strong>"Landlord"</strong>) and <strong>${tenant.firstName} ${tenant.lastName}</strong> (<strong>"Tenant"</strong>) for <u>Unit ${unit.unitNumber}, ${buildingName}</u>.</p>

<h3>1. Lump-Sum Lease Consideration</h3>
<p>The Tenant agrees to make a one-time lump-sum lease payment of <strong>₹${tenant.rentAmount}</strong> for the entire specified lease period. This payment grants exclusive occupancy for the agreed duration.</p>

<h3>2. Premises Maintenance &amp; Care</h3>
<p>The Tenant shall maintain the premises in clean condition and <u>shall not sublease or assign</u> the unit to any third party without prior written consent.</p>

<h3>3. Possession &amp; Handover</h3>
<p>Upon expiry of the agreed tenure, the Tenant agrees to hand over peaceful and vacant possession of the premises to the Landlord.</p>`;
}

interface Props {
  open:         boolean;
  onClose:      () => void;
  unit:         Unit;
  buildingId:   string;
  buildingName: string;
  prefill?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

export function AssignTenantModal({ open, onClose, unit, buildingId, buildingName, prefill }: Props) {
  const [step,       setStep]       = useState<1 | 2>(1);
  const [tenantData, setTenantData] = useState<TenantFormValues | null>(null);

  const [createTenant,    { isLoading: creatingTenant }]    = useCreateTenantMutation();
  const [createAgreement, { isLoading: creatingAgreement }] = useCreateAgreementMutation();
  const [updateUnit,      { isLoading: updatingUnit }]      = useUpdateUnitMutation();

  const tenantForm = useForm<TenantFormValues>({
    defaultValues: {
      firstName: prefill?.firstName ?? '',
      lastName: prefill?.lastName ?? '',
      email: prefill?.email ?? '',
      phone: prefill?.phone ?? '',
      job: '',
      notes: '',
      rentType: 'monthly',
      dueDate: 1,
      rentAmount: unit.rentAmount ?? 0,
    },
  });
  const agmtForm = useForm<AgreementFormValues>({
    defaultValues: {
      kind:  'rental',
      title: `${buildingName} — Unit ${unit.unitNumber} Agreement`,
      body:  '',
      terms: '',
    },
  });
  const watchKind = agmtForm.watch('kind');

  const handleClose = () => {
    setStep(1);
    tenantForm.reset();
    agmtForm.reset();
    setTenantData(null);
    onClose();
  };

  // Step 1 → Step 2
  const onTenantNext = tenantForm.handleSubmit((values) => {
    setTenantData(values);
    agmtForm.setValue('body', buildDefaultBody(agmtForm.getValues('kind'), values, unit, buildingName));
    setStep(2);
  });

  const onKindChange = (kind: AgreementKind) => {
    if (!tenantData) return;
    agmtForm.setValue('body', buildDefaultBody(kind, tenantData, unit, buildingName));
  };

  // Final submit — validate agreement dates FIRST, THEN create tenant
  const onSubmit = agmtForm.handleSubmit(async (agmt) => {
    if (!tenantData) return;

    // ── Client-side date validation before any API call ──────────────────────
    if (!agmt.startDate || !agmt.endDate) {
      agmtForm.setError('startDate', { message: 'Start date is required.' });
      agmtForm.setError('endDate',   { message: 'End date is required.' });
      return;
    }
    const start = new Date(agmt.startDate);
    const end   = new Date(agmt.endDate);
    if (isNaN(start.getTime())) {
      agmtForm.setError('startDate', { message: 'Invalid start date.' });
      return;
    }
    if (isNaN(end.getTime())) {
      agmtForm.setError('endDate', { message: 'Invalid end date.' });
      return;
    }
    if (end <= start) {
      agmtForm.setError('endDate', { message: 'End date must be after start date.' });
      toast.error('End date must be after start date.', { description: 'Please correct the agreement dates.' });
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    try {
      // 1. Create tenant — pass agreement dates for backend pre-validation too
      const tenantRes = await createTenant({
        firstName:           tenantData.firstName,
        lastName:            tenantData.lastName,
        email:               tenantData.email,
        phone:               tenantData.phone,
        buildingId,
        unitId:              unit._id,
        rentType:            tenantData.rentType,
        rentAmount:          Number(tenantData.rentAmount),
        dueDate:             Number(tenantData.dueDate),
        job:                 tenantData.job,
        notes:               tenantData.notes,
        agreementStartDate:  agmt.startDate,
        agreementEndDate:    agmt.endDate,
      }).unwrap();
      const newTenantId = tenantRes.data._id;

      // 2. Create agreement
      await createAgreement({
        tenantId:    newTenantId,
        buildingId,
        title:       agmt.title,
        body:        agmt.body,
        terms:       agmt.terms,
        monthlyRent: Number(tenantData.rentAmount),
        startDate:   agmt.startDate,
        endDate:     agmt.endDate,
      }).unwrap();

      // 3. Mark unit occupied
      await updateUnit({ id: unit._id, body: { status: 'occupied', isOccupied: true } }).unwrap();

      toast.success(`${tenantData.firstName} assigned to room ${unit.unitNumber}.`);
      handleClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not complete assignment.', { description: err?.data?.suggestion });
    }
  });

  const submitting = creatingTenant || creatingAgreement || updatingUnit;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 1 ? `Assign tenant — Room ${unit.unitNumber}` : 'Draft agreement'}
      size="xl"
    >
      {/* Step indicator */}
      <div className="mb-5 flex items-center gap-2">
        {(['1', '2'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-line" />}
            <div className={`flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${Number(s) === step ? 'bg-crimson-500 text-white' : Number(s) < step ? 'bg-sage-500 text-white' : 'bg-paper-deep text-ink-faint'}`}>
              {Number(s) < step ? <CheckCircle2 className="size-3.5" /> : s}
            </div>
            <span className={`text-xs font-medium ${Number(s) === step ? 'text-ink' : 'text-ink-faint'}`}>
              {s === '1' ? 'Tenant details' : 'Agreement'}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Tenant info ── */}
      {step === 1 && (
        <form onSubmit={onTenantNext} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" leftIcon={<User className="size-4" />} error={tenantForm.formState.errors.firstName?.message} {...tenantForm.register('firstName', { required: 'Required' })} />
            <Input label="Last name" error={tenantForm.formState.errors.lastName?.message} {...tenantForm.register('lastName', { required: 'Required' })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" leftIcon={<Mail className="size-4" />} error={tenantForm.formState.errors.email?.message} {...tenantForm.register('email', { required: 'Required' })} />
            <Input label="Phone" leftIcon={<Phone className="size-4" />} error={tenantForm.formState.errors.phone?.message} {...tenantForm.register('phone', { required: 'Required' })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Rent cycle" options={rentTypeOptions} {...tenantForm.register('rentType')} />
            <Input label="Rent amount (₹)" type="number" step="1" min={0} leftIcon={<IndianRupee className="size-4" />} error={tenantForm.formState.errors.rentAmount?.message} {...tenantForm.register('rentAmount', { required: true, valueAsNumber: true })} />
            <Input label="Due day" type="number" min={1} max={28} hint="Day of month" {...tenantForm.register('dueDate', { required: true, valueAsNumber: true })} />
          </div>
          <Input label="Occupation (optional)" leftIcon={<Briefcase className="size-4" />} {...tenantForm.register('job')} />
          <Textarea label="Notes (optional)" {...tenantForm.register('notes')} />
          <div className="flex justify-end">
            <Button type="submit" iconRight={<ChevronRight className="size-4" />}>Next: Agreement</Button>
          </div>
        </form>
      )}

      {/* ── Step 2: Agreement ── */}
      {step === 2 && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Select
            label="Agreement type"
            options={kindOptions}
            {...agmtForm.register('kind')}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              agmtForm.setValue('kind', e.target.value as AgreementKind);
              onKindChange(e.target.value as AgreementKind);
            }}
          />

          {watchKind === 'rental' && (
            <div className="rounded-xl bg-sage-50 border border-sage-200 px-4 py-3 text-sm text-sage-800">
              <strong>Rental</strong> — Tenant pays ₹{tenantData?.rentAmount} every {tenantData?.rentType?.replace('_', '-')} on the {tenantData?.dueDate}{ordinal(Number(tenantData?.dueDate))} of each period.
            </div>
          )}
          {watchKind === 'lease' && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <strong>Lease</strong> — A single lump-sum payment of ₹{tenantData?.rentAmount} covers the entire lease period.
            </div>
          )}

          <Input label="Agreement title" leftIcon={<FileText className="size-4" />} error={agmtForm.formState.errors.title?.message} {...agmtForm.register('title', { required: 'Required' })} />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start date"
              type="date"
              leftIcon={<Calendar className="size-4" />}
              error={agmtForm.formState.errors.startDate?.message}
              {...agmtForm.register('startDate', { required: 'Start date is required' })}
            />
            <Input
              label="End date"
              type="date"
              leftIcon={<Calendar className="size-4" />}
              error={agmtForm.formState.errors.endDate?.message}
              hint="Must be after start date"
              {...agmtForm.register('endDate', {
                required: 'End date is required',
                validate: (v) => {
                  const start = agmtForm.getValues('startDate');
                  if (!start || !v) return true;
                  return new Date(v) > new Date(start) || 'End date must be after start date';
                },
              })}
            />
          </div>

          <Controller
            name="body"
            control={agmtForm.control}
            rules={{ required: 'Agreement body is required' }}
            render={({ field }) => (
              <RichTextEditor
                label="Agreement body"
                hint="Format legal terms with headings, underlines, lists, and linebreaks"
                value={field.value}
                onChange={field.onChange}
                error={agmtForm.formState.errors.body?.message}
                required
                minHeight="220px"
              />
            )}
          />

          <Controller
            name="terms"
            control={agmtForm.control}
            render={({ field }) => (
              <RichTextEditor
                label="Additional terms (optional)"
                hint="Special clauses, maintenance covenants, or rules"
                value={field.value}
                onChange={field.onChange}
                minHeight="120px"
              />
            )}
          />

          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="subtle" icon={<ChevronLeft className="size-4" />} onClick={() => setStep(1)}>Back</Button>
            <Button type="submit" loading={submitting} icon={<CheckCircle2 className="size-4" />}>
              Assign &amp; create agreement
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
