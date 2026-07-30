import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { IndianRupee, Save, Star, Percent } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Avatar';
import { useGetPlatformSettingsQuery, useUpdatePlatformSettingsMutation } from '@/store/api/superAdminApi';

interface FormValues {
  platformName:            string;
  supportEmail:            string;
  monthlyPricePerBuilding: number;
  monthlyPricePerUnit:     number;
  yearlyPricePerBuilding:  number;
  yearlyPricePerUnit:      number;
  currency:                string;
  maxFeaturedBuildings:    number;
  commissionRatePercentage: number;
}

export default function SettingsPage() {
  const { data, isLoading }              = useGetPlatformSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdatePlatformSettingsMutation();
  const s = data?.data;

  const { register, handleSubmit } = useForm<FormValues>({
    values: s
      ? {
          platformName:            s.platformName,
          supportEmail:            s.supportEmail ?? '',
          monthlyPricePerBuilding: s.monthlyPricePerBuilding ?? s.pricePerBuilding,
          monthlyPricePerUnit:     s.monthlyPricePerUnit     ?? s.pricePerUnit,
          yearlyPricePerBuilding:  s.yearlyPricePerBuilding  ?? s.pricePerBuilding * 10,
          yearlyPricePerUnit:      s.yearlyPricePerUnit      ?? s.pricePerUnit * 10,
          currency:                s.currency,
          maxFeaturedBuildings:    s.maxFeaturedBuildings,
          commissionRatePercentage: s.commissionRatePercentage ?? 10,
        }
      : undefined,
  });

  if (isLoading) return <PageLoader />;

  const onSubmit = async (values: FormValues) => {
    try {
      await updateSettings({
        ...values,
        // Keep legacy fields in sync with monthly prices
        pricePerBuilding:        Number(values.monthlyPricePerBuilding),
        pricePerUnit:            Number(values.monthlyPricePerUnit),
        monthlyPricePerBuilding: Number(values.monthlyPricePerBuilding),
        monthlyPricePerUnit:     Number(values.monthlyPricePerUnit),
        yearlyPricePerBuilding:  Number(values.yearlyPricePerBuilding),
        yearlyPricePerUnit:      Number(values.yearlyPricePerUnit),
        maxFeaturedBuildings:    Number(values.maxFeaturedBuildings),
        commissionRatePercentage: Number(values.commissionRatePercentage),
      }).unwrap();
      toast.success('Platform settings updated.');
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not save settings.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Platform Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Control pricing, branding, and global limits.</p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Input label="Platform name" {...register('platformName', { required: true })} />
          <Input label="Support email" type="email" {...register('supportEmail')} />

          <div className="border-t border-line pt-5">
            <p className="mb-1 text-sm font-semibold text-ink">Monthly subscription pricing</p>
            <p className="mb-3 text-xs text-ink-faint">Charged per billing cycle when builder selects monthly plan.</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Per building / month"
                type="number"
                step="1"
                min={0}
                leftIcon={<IndianRupee className="size-4" />}
                hint="₹ per building per month"
                {...register('monthlyPricePerBuilding', { required: true, valueAsNumber: true })}
              />
              <Input
                label="Per room / month"
                type="number"
                step="1"
                min={0}
                leftIcon={<IndianRupee className="size-4" />}
                hint="₹ per room per month"
                {...register('monthlyPricePerUnit', { required: true, valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <p className="mb-1 text-sm font-semibold text-ink">Yearly subscription pricing</p>
            <p className="mb-3 text-xs text-ink-faint">Charged per billing cycle when builder selects yearly plan. Typically ~10× monthly for a discount.</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Per building / year"
                type="number"
                step="1"
                min={0}
                leftIcon={<IndianRupee className="size-4" />}
                hint="₹ per building per year"
                {...register('yearlyPricePerBuilding', { required: true, valueAsNumber: true })}
              />
              <Input
                label="Per room / year"
                type="number"
                step="1"
                min={0}
                leftIcon={<IndianRupee className="size-4" />}
                hint="₹ per room per year"
                {...register('yearlyPricePerUnit', { required: true, valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <p className="mb-3 text-sm font-semibold text-ink">Featured listings</p>
            <Input
              label="Max featured buildings"
              type="number"
              min={1}
              max={50}
              leftIcon={<Star className="size-4" />}
              hint="Max simultaneous featured listings on the public homepage."
              {...register('maxFeaturedBuildings', { required: true, valueAsNumber: true })}
            />
          </div>

          <div className="border-t border-line pt-5">
            <p className="mb-3 text-sm font-semibold text-ink">Booking commission</p>
            <Input
              label="Commission rate on online booking payments"
              type="number"
              min={0}
              max={100}
              step="0.5"
              leftIcon={<Percent className="size-4" />}
              hint="Percentage of each online booking token payment retained by the platform. Applies to new payments going forward — existing bookings keep the rate that was active when they were paid."
              {...register('commissionRatePercentage', { required: true, valueAsNumber: true, min: 0, max: 100 })}
            />
          </div>

          <Button type="submit" loading={saving} icon={<Save className="size-4" />} className="w-fit">
            Save settings
          </Button>
        </form>
      </Card>
    </div>
  );
}
