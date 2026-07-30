import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Layers3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FloorSlab } from './FloorSlab';
import { RoomDetailDrawer } from './RoomDetailDrawer';
import { AssignTenantModal } from './AssignTenantModal';
import { ReservedTenantModal } from './ReservedTenantModal';
import { TransferTenantModal } from './TransferTenantModal';
import { AddFloorModal, AddRoomModal, EditFloorModal } from './FloorRoomModals';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RecordPaymentModal } from '@/components/payment/RecordPaymentModal';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/ui/EmptyState';
import { useGetFloorsByBuildingQuery, useDeleteFloorMutation } from '@/store/api/buildingApi';
import { useGetUnitsQuery, useUpdateUnitMutation } from '@/store/api/unitApi';
import { useGetTenantsQuery } from '@/store/api/tenantApi';
import { toast } from 'sonner';
import type { Floor, Unit } from '@/types/building';
import type { Tenant } from '@/types/tenancy';

interface Props {
  buildingId:   string;
  buildingName: string;
}

export function BuildingDiagram({ buildingId, buildingName }: Props) {
  const navigate = useNavigate();
  const { data: floorsData, isLoading: floorsLoading } = useGetFloorsByBuildingQuery(buildingId);
  const { data: unitsData,  isLoading: unitsLoading }  = useGetUnitsQuery({ buildingId });
  const { data: tenantsData }                           = useGetTenantsQuery({ buildingId });
  const [deleteFloor, { isLoading: deletingFloor }] = useDeleteFloorMutation();
  const [updateUnit]                                = useUpdateUnitMutation();

  // Modals / drawers
  const [editUnit,          setEditUnit]          = useState<Unit | null>(null);
  const [assignUnit,        setAssignUnit]        = useState<Unit | null>(null);
  const [assignPrefill, setAssignPrefill] = useState<{ firstName?: string; lastName?: string; email?: string; phone?: string } | undefined>(undefined);
  const [reservedTenantUnit, setReservedTenantUnit] = useState<Unit | null>(null);
  const [paymentUnit,       setPaymentUnit]       = useState<Unit | null>(null);
  const [transferUnit,      setTransferUnit]      = useState<Unit | null>(null);
  const [addFloorOpen,      setAddFloorOpen]      = useState(false);
  const [editFloor,         setEditFloor]         = useState<Floor | null>(null);
  const [deleteFloorTarget, setDeleteFloorTarget] = useState<Floor | null>(null);
  const [addRoomFloor,      setAddRoomFloor]      = useState<Floor | null>(null);

  const floors = useMemo(
    () => [...(floorsData?.data ?? [])].sort((a, b) => b.floorNumber - a.floorNumber),
    [floorsData]
  );

  const unitsByFloor = useMemo(() => {
    const map = new Map<string, Unit[]>();
    for (const u of unitsData?.data ?? []) {
      const arr = map.get(u.floorNumber) ?? [];
      arr.push(u);
      map.set(u.floorNumber, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }));
    return map;
  }, [unitsData]);

  // Map unitId → tenant for quick lookup
  const tenantByUnit = useMemo(() => {
    const map = new Map<string, Tenant>();
    for (const t of tenantsData?.data ?? []) {
      if (t.unitId) map.set(t.unitId, t);
    }
    return map;
  }, [tenantsData]);

  const nextFloorNumber = floors.length ? Math.max(...floors.map(f => f.floorNumber)) + 1 : 0;

  const suggestedUnitNumber = (floor: Floor) => {
    const existing = unitsByFloor.get(floor.floorNumber.toString()) ?? [];
    let max = 0;
    for (const u of existing) {
      const suffix = parseInt(u.unitNumber.replace(`${floor.floorNumber}`, ''), 10);
      if (!isNaN(suffix) && suffix > max) max = suffix;
    }
    return `${floor.floorNumber}${(max + 1).toString().padStart(2, '0')}`;
  };

  const onConfirmDeleteFloor = async () => {
    if (!deleteFloorTarget) return;
    try {
      await deleteFloor({ id: deleteFloorTarget._id, buildingId }).unwrap();
      toast.success(`${deleteFloorTarget.name} removed.`);
      setDeleteFloorTarget(null);
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not delete floor.', { description: err?.data?.suggestion });
    }
  };

  const handleMakeAvailable = async (unit: Unit) => {
    try {
      await updateUnit({ id: unit._id, body: { status: 'available', isOccupied: false } }).unwrap();
      toast.success(`Room ${unit.unitNumber} marked as available.`);
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not update room status.', { description: err?.data?.suggestion });
    }
  };

  const handleViewTenant = (unit: Unit) => {
    const tenant = tenantByUnit.get(unit._id);
    if (tenant) {
      navigate(`/dashboard/tenants/${tenant._id}`);
    } else if (unit.status === 'reserved') {
      setReservedTenantUnit(unit);
    } else {
      toast.error('No tenant linked to this room.');
    }
  };

  // For payment modal, get the tenant in the unit
  const getPaymentTenant = (unit: Unit) => {
    return tenantByUnit.get(unit._id) ?? null;
  };

  const loading = floorsLoading || unitsLoading;

  return (
    <div className="rounded-2xl border border-line bg-paper-dim/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Layers3 className="size-4 text-crimson-500" />
          <span className="font-medium text-ink">{floors.length}</span> floor{floors.length !== 1 && 's'} ·{' '}
          <span className="font-medium text-ink">{unitsData?.data.length ?? 0}</span> room{(unitsData?.data.length ?? 0) !== 1 && 's'}
        </div>
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setAddFloorOpen(true)}>Add floor</Button>
      </div>

      {!loading && floors.length === 0 ? (
        <EmptyState
          icon={<Layers3 className="size-6" />}
          title="No floors yet"
          description="Add your first floor to start mapping out rooms."
          action={<Button icon={<Plus className="size-4" />} onClick={() => setAddFloorOpen(true)}>Add first floor</Button>}
        />
      ) : (
        <div className="flex flex-col-reverse gap-3">
          <AnimatePresence initial={false}>
            {floors.map((floor, i) => (
              <FloorSlab
                key={floor._id}
                floor={floor}
                units={unitsByFloor.get(floor.floorNumber.toString()) ?? []}
                loading={loading}
                editable
                index={i}
                onRoomClick={setEditUnit}
                onRoomEdit={setEditUnit}
                onRoomAssign={(unit) => setAssignUnit(unit)}
                onRoomViewTenant={handleViewTenant}
                onRoomAddPayment={(unit) => setPaymentUnit(unit)}
                onRoomTransfer={(unit) => setTransferUnit(unit)}
                onRoomMakeAvailable={handleMakeAvailable}
                onAddRoom={() => setAddRoomFloor(floor)}
                onEditFloor={() => setEditFloor(floor)}
                onDeleteFloor={() => setDeleteFloorTarget(floor)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <RoomDetailDrawer unit={editUnit} open={!!editUnit} onClose={() => setEditUnit(null)} />

      {assignUnit && (
        <AssignTenantModal
          open={!!assignUnit}
          onClose={() => { setAssignUnit(null); setAssignPrefill(undefined); }}
          unit={assignUnit}
          buildingId={buildingId}
          buildingName={buildingName}
          prefill={assignPrefill}
        />
      )}

      {reservedTenantUnit && (
        <ReservedTenantModal
          open={!!reservedTenantUnit}
          onClose={() => setReservedTenantUnit(null)}
          unitId={reservedTenantUnit._id}
          unitNumber={reservedTenantUnit.unitNumber}
          onCreateFullTenant={(prefill) => {
            const [firstName, ...rest] = prefill.name.trim().split(' ');
            setAssignPrefill({
              firstName,
              lastName: rest.join(' '),
              email: prefill.email,
              phone: prefill.phone,
            });
            setAssignUnit(reservedTenantUnit);
            setReservedTenantUnit(null);
          }}
        />
      )}

      {paymentUnit && (() => {
        const t = getPaymentTenant(paymentUnit);
        if (!t) return null;
        return (
          <RecordPaymentModal
            open
            onClose={() => setPaymentUnit(null)}
            tenant={{ _id: t._id, firstName: t.firstName, lastName: t.lastName, rentAmount: t.rentAmount, rentType: t.rentType }}
          />
        );
      })()}

      {transferUnit && (() => {
        const currentTenant = tenantByUnit.get(transferUnit._id);
        
        // Guard clause: If no tenant is mapped to this room yet, don't render the modal
        if (!currentTenant) return null; 

        return (
          <TransferTenantModal
            open
            onClose={() => setTransferUnit(null)}
            tenant={{ 
              _id: currentTenant._id, 
              firstName: currentTenant.firstName, 
              lastName: currentTenant.lastName, 
              unitId: transferUnit._id 
            }}
            buildingId={buildingId}
          />
        );
      })()}

      <AddFloorModal open={addFloorOpen} onClose={() => setAddFloorOpen(false)} buildingId={buildingId} nextFloorNumber={nextFloorNumber} />

      {editFloor && (
        <EditFloorModal
          open={!!editFloor}
          onClose={() => setEditFloor(null)}
          buildingId={buildingId}
          floorId={editFloor._id}
          currentName={editFloor.name}
          currentTotalUnits={(unitsByFloor.get(editFloor.floorNumber.toString()) ?? []).length}
        />
      )}

      {addRoomFloor && (
        <AddRoomModal
          open={!!addRoomFloor}
          onClose={() => setAddRoomFloor(null)}
          buildingId={buildingId}
          floorNumber={addRoomFloor.floorNumber}
          suggestedUnitNumber={suggestedUnitNumber(addRoomFloor)}
        />
      )}

      <ConfirmDialog
        open={!!deleteFloorTarget}
        onClose={() => setDeleteFloorTarget(null)}
        onConfirm={onConfirmDeleteFloor}
        loading={deletingFloor}
        title={`Delete ${deleteFloorTarget?.name}?`}
        description="All vacant rooms on this floor will be removed. Floors with occupied or reserved rooms can't be deleted."
        confirmLabel="Delete floor"
      />
    </div>
  );
}
