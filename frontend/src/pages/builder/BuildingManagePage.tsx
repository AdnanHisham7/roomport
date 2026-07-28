import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Globe, EyeOff, MapPin, Building2, Image as ImageIcon, Loader2, Trash2, Save, LocateFixed } from 'lucide-react';
import { Button, Input, Textarea, Select } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { StatusPill, Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Avatar';
import { BuildingDiagram } from '@/components/building/BuildingDiagram';
import { useGetBuildingByIdQuery, useUpdateBuildingMutation, useDeleteBuildingMutation } from '@/store/api/buildingApi';
import { useUploadMultipleImagesMutation } from '@/store/api/uploadApi';
import { useAuth } from '@/hooks/useAuth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const buildingTypeOptions = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial',  label: 'Commercial' },
  { value: 'mixed',       label: 'Mixed use' },
  { value: 'industrial',  label: 'Industrial' },
];

interface DetailsForm {
  name: string; type: string; description: string; yearOfBuild: string; sqft: number;
  address: string; city: string; state: string; pincode: string; landmark: string; country: string; amenities: string;
  latitude?: number; longitude?: number;
}

export default function BuildingManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('rooms');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = useGetBuildingByIdQuery(id!, { skip: !id });
  const [updateBuilding, { isLoading: saving }]   = useUpdateBuildingMutation();
  const [deleteBuilding, { isLoading: deleting }] = useDeleteBuildingMutation();
  const [uploadImages,   { isLoading: uploading }] = useUploadMultipleImagesMutation();

  const building = data?.data;

  // ── Fix: initialise images from the loaded building, not just useState() ──
  const [images, setImages] = useState<string[]>([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  useEffect(() => {
    if (building) setImages(building.images ?? []);
  }, [building]);

  const { register, handleSubmit, setValue } = useForm<DetailsForm>({
    values: building
      ? {
          name:        building.name,
          type:        building.type,
          description: building.description ?? '',
          yearOfBuild: building.yearOfBuild ?? '',
          sqft:        building.sqft ?? 0,
          address:     building.location.address,
          city:        building.location.city,
          state:       building.location.state,
          pincode:     building.location.pincode,
          landmark:    building.location.landmark ?? '',
          country:     building.location.country,
          amenities:   building.amenities?.join(', ') ?? '',
          latitude:    building.location.latitude ?? undefined,
          longitude:   building.location.longitude ?? undefined,
        }
      : undefined,
  });

  if (isLoading) return <PageLoader />;
  if (!building || !id) return <p className="text-ink-soft">Building not found.</p>;

  const onSubmit = async (values: DetailsForm) => {
    try {
      await updateBuilding({
        id,
        body: {
          name:        values.name,
          type:        values.type as any,
          description: values.description,
          yearOfBuild: values.yearOfBuild,
          sqft:        Number(values.sqft) || undefined,
          location:    { address: values.address, city: values.city, state: values.state, pincode: values.pincode, landmark: values.landmark, country: values.country, latitude: values.latitude, longitude: values.longitude },
          amenities:   values.amenities.split(',').map(a => a.trim()).filter(Boolean),
          images,   // ← always send current images array
        },
      }).unwrap();
      toast.success('Building details updated.');
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not update building.');
    }
  };

  const togglePublish = async () => {
    try {
      await updateBuilding({ id, body: { isPublished: !building.isPublished } }).unwrap();
      toast.success(building.isPublished ? 'Listing unpublished.' : 'Listing published — visible to renters now.');
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not update visibility.');
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location detection.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', Number(position.coords.latitude.toFixed(6)), { shouldDirty: true });
        setValue('longitude', Number(position.coords.longitude.toFixed(6)), { shouldDirty: true });
        setDetectingLocation(false);
        toast.success('Location detected — remember to save changes.');
      },
      () => {
        setDetectingLocation(false);
        toast.error('Could not detect your location. Enter coordinates manually if needed.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    try {
      const res = await uploadImages({ category: 'buildings', files }).unwrap();
      setImages(prev => [...prev, ...res.data.map(f => f.url)]);
    } catch {
      toast.error('Image upload failed.');
    }
  };

  const onDelete = async () => {
    try {
      await deleteBuilding(id).unwrap();
      toast.success('Building deleted.');
      navigate('/dashboard/buildings');
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not delete building.', { description: err?.data?.suggestion });
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={() => navigate('/dashboard/buildings')} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Buildings
      </button>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold text-ink">{building.name}</h1>
            <StatusPill status={building.status} />
            {building.isFeatured && <Badge tone="amber">Featured</Badge>}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <MapPin className="size-3.5" /> {building.location.city}, {building.location.state}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={building.isPublished ? 'outline' : 'primary'} size="sm" icon={building.isPublished ? <EyeOff className="size-4" /> : <Globe className="size-4" />} onClick={togglePublish}>
            {building.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
          {isAdmin && (
            <Button variant="danger" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setDeleteOpen(true)}>Delete</Button>
          )}
        </div>
      </div>

      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'rooms',   label: 'Room Manager', icon: <Building2 className="size-3.5" /> },
          { value: 'details', label: 'Building Details' },
        ]}
      />

      {tab === 'rooms' && (
        <BuildingDiagram buildingId={id} buildingName={building.name} />
      )}

      {tab === 'details' && (
        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Building name" {...register('name', { required: true })} />
              <Select label="Type" options={buildingTypeOptions} {...register('type')} />
            </div>
            <Textarea label="Description" placeholder="Tell renters what makes this building great..." {...register('description')} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Input label="Year built" {...register('yearOfBuild')} />
              <Input label="Total sqft" type="number" {...register('sqft')} />
            </div>

            <div className="border-t border-line pt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Location</p>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detectingLocation}
                  className="flex items-center gap-1.5 text-xs font-medium text-crimson-600 hover:text-crimson-700 disabled:opacity-50"
                >
                  {detectingLocation ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5" />}
                  Use current location
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Address" className="sm:col-span-2" {...register('address', { required: true })} />
                <Input label="City"    {...register('city',    { required: true })} />
                <Input label="State"   {...register('state',   { required: true })} />
                <Input label="Pincode" {...register('pincode', { required: true })} />
                <Input label="Landmark" {...register('landmark')} />
                <Input label="Country" {...register('country', { required: true })} />
                <Input label="Latitude" type="number" step="any" hint="Needed for 'near me' search on the public site" {...register('latitude', { valueAsNumber: true })} />
                <Input label="Longitude" type="number" step="any" {...register('longitude', { valueAsNumber: true })} />
              </div>
            </div>

            <Input label="Amenities" placeholder="Lift, Parking, Gym (comma separated)" {...register('amenities')} />

            {/* Photos — fix: initialised from building.images via useEffect */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-soft">Photos</label>
              <div className="flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative size-20 overflow-hidden rounded-xl border border-line">
                    <img src={src} alt="" className="size-full object-cover" />
                    <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 rounded-full bg-ink/60 p-0.5 text-white">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
                <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-ink-faint transition hover:border-crimson-300 hover:text-crimson-500">
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImageIcon className="size-5" />}
                  <span className="text-[10px] font-medium">Upload</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onFilesSelected} />
                </label>
              </div>
            </div>

            <Button type="submit" loading={saving} icon={<Save className="size-4" />} className="w-fit justify-center">Save details</Button>
          </form>
        </Card>
      )}

      <ConfirmDialog
        open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={onDelete} loading={deleting}
        title="Delete this building?" description="This removes every floor and room with it. Buildings with occupied rooms can't be deleted." confirmLabel="Delete building"
      />
    </div>
  );
}
