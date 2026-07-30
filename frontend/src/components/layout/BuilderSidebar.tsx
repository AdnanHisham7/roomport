import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Building2, Users, FileSignature, FileText, Wallet,
  MessageSquare, UserCog, CreditCard, History, ChevronsLeft, Building,
  CalendarCheck, Tag, Receipt,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar } from '@/store/slices/uiSlice';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/buildings', label: 'Buildings', icon: Building2 },
  { to: '/dashboard/tenants', label: 'Tenants', icon: Users },
  { to: '/dashboard/agreements', label: 'Agreements', icon: FileSignature },
  { to: '/dashboard/documents', label: 'Documents', icon: FileText },
  { to: '/dashboard/expenses', label: 'Expenses', icon: Wallet },
  { to: '/dashboard/inquiries', label: 'Inquiries', icon: MessageSquare },
  { to: '/dashboard/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/dashboard/offers', label: 'Offers', icon: Tag },
  { to: '/dashboard/transactions', label: 'Transactions', icon: Receipt },
  { to: '/dashboard/managers', label: 'Managers', icon: UserCog, adminOnly: true },
  { to: '/dashboard/billing', label: 'Billing', icon: CreditCard, adminOnly: true },
  { to: '/dashboard/activity', label: 'Activity', icon: History },
];

export function BuilderSidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed) && !mobile;
  const dispatch = useAppDispatch();
  const { isAdmin } = useAuth();

  return (
    <div className={cn('flex h-full flex-col bg-white/80 backdrop-blur-xl', !mobile && 'border-r border-line')}>
      <div className={cn('flex items-center gap-2 px-4 py-5', collapsed && 'justify-center px-2')}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-crimson-500 to-crimson-700 text-white shadow-[0_8px_18px_-6px_rgba(200,30,61,0.55)]">
          <Building className="size-4.5" />
        </span>
        {!collapsed && <span className="font-display text-lg font-semibold tracking-tight">RoomPort</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-2">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive ? 'text-crimson-700' : 'text-ink-soft hover:bg-paper-dim hover:text-ink'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div layoutId="builder-nav-pill" className="absolute inset-0 rounded-xl bg-crimson-50" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                  )}
                  <item.icon className="relative z-10 size-[18px] shrink-0" />
                  {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
      </nav>

      {!mobile && (
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="m-2.5 flex items-center justify-center gap-2 rounded-xl border border-line py-2 text-xs font-medium text-ink-faint transition hover:bg-paper-dim hover:text-ink"
        >
          <ChevronsLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && 'Collapse'}
        </button>
      )}
    </div>
  );
}
