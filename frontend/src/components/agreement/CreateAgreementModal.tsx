import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { DollarSign, Calendar } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, RichTextEditor } from '@/components/ui';
import { useCreateAgreementMutation } from '@/store/api/agreementApi';
import { useGetTenantsQuery } from '@/store/api/tenantApi';
import { useGetBuildingsQuery } from '@/store/api/buildingApi';

interface FormValues {
  tenantId: string;
  buildingId: string;
  title: string;
  body: string;
  terms: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
}

const defaultAgreementHtml = `<h2>Residential Lease Agreement</h2>
<p>This agreement is entered into between the property owner (<strong>"Landlord"</strong>) and the tenant (<strong>"Tenant"</strong>) for the rental of the specified unit, under the terms and conditions outlined below.</p>

<h3>1. Premises &amp; Occupancy</h3>
<p>The premises shall be used exclusively for <u>residential purposes only</u>. The Tenant agrees to maintain the premises in a clean, hygienic, and damage-free condition.</p>

<h3>2. Rent &amp; Payment Schedule</h3>
<p>The Tenant agrees to pay the stipulated monthly rent on or before the due date each month. Late payments may attract a penalty as agreed upon by both parties.</p>

<h3>3. Prohibitions &amp; Subletting</h3>
<p>The Tenant <u>shall not sublease or assign</u> the premises to any third party without the express prior written consent of the Landlord.</p>`;

export function CreateAgreementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [createAgreement, { isLoading }] = useCreateAgreementMutation();
  const { data: tenantsData } = useGetTenantsQuery();
  const { data: buildingsData } = useGetBuildingsQuery();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: 'Residential Lease Agreement',
      body: defaultAgreementHtml,
      terms: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createAgreement({ ...values, monthlyRent: Number(values.monthlyRent) }).unwrap();
      toast.success('Agreement drafted successfully.');
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not create agreement.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Draft a new agreement" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tenant"
            placeholder="Select tenant"
            options={(tenantsData?.data ?? []).map((t) => ({ value: t._id, label: `${t.firstName} ${t.lastName}` }))}
            error={errors.tenantId?.message}
            {...register('tenantId', { required: 'Required' })}
          />
          <Select
            label="Building"
            placeholder="Select building"
            options={(buildingsData?.data ?? []).map((b) => ({ value: b._id, label: b.name }))}
            error={errors.buildingId?.message}
            {...register('buildingId', { required: 'Required' })}
          />
        </div>

        <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />

        <Controller
          name="body"
          control={control}
          rules={{ required: 'Agreement body is required' }}
          render={({ field }) => (
            <RichTextEditor
              label="Agreement body"
              hint="Format clauses with headings, bold, underline, lists, and linebreaks"
              value={field.value}
              onChange={field.onChange}
              error={errors.body?.message}
              required
              minHeight="240px"
            />
          )}
        />

        <Controller
          name="terms"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              label="Additional terms (optional)"
              hint="Special conditions, deposit terms, or custom covenants"
              value={field.value}
              onChange={field.onChange}
              minHeight="140px"
            />
          )}
        />

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Monthly rent"
            type="number"
            step="0.01"
            leftIcon={<DollarSign className="size-4" />}
            error={errors.monthlyRent?.message}
            {...register('monthlyRent', { required: true, valueAsNumber: true })}
          />
          <Input
            label="Start date"
            type="date"
            leftIcon={<Calendar className="size-4" />}
            error={errors.startDate?.message}
            {...register('startDate', { required: 'Required' })}
          />
          <Input
            label="End date"
            type="date"
            leftIcon={<Calendar className="size-4" />}
            error={errors.endDate?.message}
            {...register('endDate', { required: 'Required' })}
          />
        </div>

        <Button type="submit" loading={isLoading} className="mt-2 justify-center">
          Create draft
        </Button>
      </form>
    </Modal>
  );
}
