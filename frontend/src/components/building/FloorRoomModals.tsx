import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Layers, DollarSign, BedDouble, Bath, Coins } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input } from '@/components/ui';
import { useCreateFloorMutation, useUpdateFloorMutation } from '@/store/api/buildingApi';
import { useCreateUnitMutation } from '@/store/api/unitApi';

interface AddFloorValues {
  floorNumber: number;
  name: string;
  totalUnits: number;
}

export function AddFloorModal({ open, onClose, buildingId, nextFloorNumber }: { open: boolean; onClose: () => void; buildingId: string; nextFloorNumber: number }) {
  const [createFloor, { isLoading }] = useCreateFloorMutation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddFloorValues>({
    defaultValues: { floorNumber: nextFloorNumber, name: `Floor ${nextFloorNumber}`, totalUnits: 4 },
  });

  const onSubmit = async (values: AddFloorValues) => {
    try {
      await createFloor({ buildingId, body: { floorNumber: Number(values.floorNumber), name: values.name, totalUnits: Number(values.totalUnits) } }).unwrap();
      toast.success(`${values.name} added with ${values.totalUnits} room(s).`);
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not add floor.', { description: err?.data?.suggestion });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a floor" description="New rooms are generated automatically for this floor.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Floor number" type="number" hint="0 = Ground floor, negative = basement" leftIcon={<Layers className="size-4" />} error={errors.floorNumber?.message} {...register('floorNumber', { required: true, valueAsNumber: true })} />
        <Input label="Floor name" placeholder="e.g. Ground Floor" error={errors.name?.message} {...register('name', { required: true })} />
        <Input label="Number of rooms" type="number" min={0} error={errors.totalUnits?.message} {...register('totalUnits', { required: true, valueAsNumber: true, min: 0 })} />
        <Button type="submit" loading={isLoading} className="mt-1 justify-center">Add floor</Button>
      </form>
    </Modal>
  );
}

interface EditFloorValues {
  name: string;
  totalUnits: number;
}

export function EditFloorModal({
  open,
  onClose,
  buildingId,
  floorId,
  currentName,
  currentTotalUnits,
}: {
  open: boolean;
  onClose: () => void;
  buildingId: string;
  floorId: string;
  currentName: string;
  currentTotalUnits: number;
}) {
  const [updateFloor, { isLoading }] = useUpdateFloorMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<EditFloorValues>({
    values: { name: currentName, totalUnits: currentTotalUnits },
  });

  const onSubmit = async (values: EditFloorValues) => {
    try {
      await updateFloor({ id: floorId, buildingId, body: { name: values.name, totalUnits: Number(values.totalUnits) } }).unwrap();
      toast.success('Floor updated.');
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not update floor.', { description: err?.data?.suggestion });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit floor" description="Raising room count adds new vacant rooms; lowering it removes the newest vacant ones." size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Floor name" error={errors.name?.message} {...register('name', { required: true })} />
        <Input label="Number of rooms" type="number" min={0} error={errors.totalUnits?.message} {...register('totalUnits', { required: true, valueAsNumber: true, min: 0 })} />
        <Button type="submit" loading={isLoading} className="mt-1 justify-center">Save changes</Button>
      </form>
    </Modal>
  );
}

interface AddRoomValues {
  unitNumber: string;
  rentAmount: number;
  bedrooms: number;
  bathrooms: number;
  tokenAmount?: number;
}

export function AddRoomModal({
  open,
  onClose,
  buildingId,
  floorNumber,
  suggestedUnitNumber,
}: {
  open: boolean;
  onClose: () => void;
  buildingId: string;
  floorNumber: number;
  suggestedUnitNumber: string;
}) {
  const [createUnit, { isLoading }] = useCreateUnitMutation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddRoomValues>({
    values: { unitNumber: suggestedUnitNumber, rentAmount: 0, bedrooms: 1, bathrooms: 1, tokenAmount: 0 },
  });

  const onSubmit = async (values: AddRoomValues) => {
    try {
      await createUnit({
        unitNumber: values.unitNumber,
        floorNumber: floorNumber.toString(),
        buildingId,
        rentAmount: Number(values.rentAmount),
        bedrooms: Number(values.bedrooms),
        bathrooms: Number(values.bathrooms),
        tokenAmount: Number(values.tokenAmount) || 0,
      }).unwrap();
      toast.success(`Room ${values.unitNumber} added.`);
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not add room.', { description: err?.data?.suggestion });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a room" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Room number" error={errors.unitNumber?.message} {...register('unitNumber', { required: true })} />
        <Input label="Monthly rent" type="number" step="0.01" leftIcon={<DollarSign className="size-4" />} {...register('rentAmount', { valueAsNumber: true })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Bedrooms" type="number" min={0} leftIcon={<BedDouble className="size-4" />} {...register('bedrooms', { valueAsNumber: true })} />
          <Input label="Bathrooms" type="number" min={0} leftIcon={<Bath className="size-4" />} {...register('bathrooms', { valueAsNumber: true })} />
        </div>
        <Input
          label="Booking token amount (optional)"
          type="number" step="0.01" min={0}
          leftIcon={<Coins className="size-4" />}
          hint="Amount applicants can pay online to book this room from the public listing"
          {...register('tokenAmount', { valueAsNumber: true })}
        />
        <Button type="submit" loading={isLoading} className="mt-1 justify-center">Add room</Button>
      </form>
    </Modal>
  );
}
