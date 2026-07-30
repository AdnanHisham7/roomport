import { Mail, Phone, CalendarClock, UserPlus, ShieldCheck, Wallet } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import { PageLoader } from '@/components/ui/Avatar';
import { useGetReservedTenantByUnitQuery } from '@/store/api/reservedTenantApi';
import { formatCurrency, formatDate } from '@/utils/format';

interface Props {
  open: boolean;
  onClose: () => void;
  unitId: string;
  unitNumber: string;
  onCreateFullTenant: (prefill: { name: string; email: string; phone?: string }) => void;
}

export function ReservedTenantModal({ open, onClose, unitId, unitNumber, onCreateFullTenant }: Props) {
  const { data, isLoading } = useGetReservedTenantByUnitQuery(unitId, { skip: !open });
  const reserved = data?.data;

  return (
    <Modal open={open} onClose={onClose} title={`Room ${unitNumber} — Reserved`}>
      {isLoading ? (
        <PageLoader />
      ) : !reserved ? (
        <p className="text-sm text-ink-soft">
          This room is marked as reserved, but no booking applicant details were found for it.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-ink">{reserved.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft"><Mail className="size-3.5" /> {reserved.email}</p>
            {reserved.phone && <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-soft"><Phone className="size-3.5" /> {reserved.phone}</p>}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-line bg-paper-dim px-3 py-2.5 text-sm">
            {reserved.isPaid ? (
              <span className="flex items-center gap-1.5 font-medium text-sage-600"><ShieldCheck className="size-4" /> Paid {formatCurrency(reserved.amount)} online</span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-ink-soft"><Wallet className="size-4" /> Will pay at property</span>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            <CalendarClock className="size-3.5" /> Reserved on {formatDate(reserved.reservedAt)}
          </p>

          <Button
            icon={<UserPlus className="size-4" />}
            onClick={() => onCreateFullTenant({ name: reserved.name, email: reserved.email, phone: reserved.phone })}
            className="justify-center"
          >
            Create full tenant record
          </Button>
        </div>
      )}
    </Modal>
  );
}
