import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users2, Building2, CreditCard,
  History, Settings, ChevronsLeft, ShieldCheck, MessageSquare, ArrowUpCircle, Wallet,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar } from '@/store/slices/uiSlice';
import { useGetUpgradeRequestsQuery } from '@/store/api/superAdminApi';
import { cn } from '@/utils/cn';

const navItems = [
  { to: '/super-admin',                     label: 'Overview',          icon: LayoutDashboard, end: true },
  { to: '/super-admin/builders',            label: 'Builders',          icon: Users2 },
  { to: '/super-admin/buildings',           label: 'Buildings',         icon: Building2 },
  { to: '/super-admin/subscriptions',       label: 'Subscriptions',     icon: CreditCard },
  { to: '/super-admin/upgrade-requests',    label: 'Upgrade Requests',  icon: ArrowUpCircle, badge: true },
  { to: '/super-admin/payouts',             label: 'Payouts',           icon: Wallet },
  { to: '/super-admin/demo-requests',       label: 'Demo Requests',     icon: MessageSquare },
  { to: '/super-admin/activity',            label: 'Activity',          icon: History },
  { to: '/super-admin/settings',            label: 'Settings',          icon: Settings },
];

export function SuperAdminSidebar({
  mobile,
  onNavigate,
}: {
  mobile?:     boolean;
  onNavigate?: () => void;
}) {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed) && !mobile;
  const dispatch  = useAppDispatch();

  const { data: upgradeData } = useGetUpgradeRequestsQuery(
    { status: 'pending', limit: 1 },
    { pollingInterval: 30000 }
  );
  const pendingUpgrades = upgradeData?.total ?? 0;

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-ink text-white/90',
        !mobile && 'border-r border-white/10'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-5',
          collapsed && 'justify-center px-2'
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-crimson-500 to-crimson-700 text-white">
          <ShieldCheck className="size-4.5" />
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-display text-[15px] font-semibold tracking-tight text-white">
              RoomPort
            </p>
            <p className="text-[10.5px] font-medium uppercase tracking-wider text-white/40">
              Super Admin
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-2">
        {navItems.map((item) => {
          const badgeCount = item.badge ? pendingUpgrades : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'text-white'
                    : 'text-white/55 hover:bg-white/5 hover:text-white/90'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sa-nav-pill"
                      className="absolute inset-0 rounded-xl bg-crimson-600"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex shrink-0 items-center">
                    <item.icon className="size-[18px]" />
                    {badgeCount > 0 && collapsed && (
                      <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-ink">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </span>
                  {!collapsed && (
                    <span className="relative z-10 flex flex-1 items-center justify-between truncate">
                      {item.label}
                      {badgeCount > 0 && (
                        <span className="ml-2 flex size-5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-ink">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      {!mobile && (
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="m-2.5 flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-xs font-medium text-white/40 transition hover:bg-white/5 hover:text-white/80"
        >
          <ChevronsLeft
            className={cn(
              'size-4 transition-transform',
              collapsed && 'rotate-180'
            )}
          />
          {!collapsed && 'Collapse'}
        </button>
      )}
    </div>
  );
}
