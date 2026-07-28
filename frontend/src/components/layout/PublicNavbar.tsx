import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Building2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui';
import { Avatar } from '@/components/ui/Avatar';

const links = [
  { to: '/listings', label: 'Browse Spaces' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/#pricing', label: 'Pricing' },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl glass px-4 py-2.5 shadow-[var(--shadow-glass)] sm:px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-crimson-500 to-crimson-700 text-white shadow-[0_8px_18px_-6px_rgba(200,30,61,0.55)]">
            <Building2 className="size-4.5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">RoomPort</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors ${isActive ? 'text-crimson-600' : 'text-ink-soft hover:text-ink'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          {isAuthenticated ? (
            <button
              onClick={() => navigate(isSuperAdmin ? '/super-admin' : '/dashboard')}
              className="flex items-center gap-2 rounded-xl border border-line bg-white/70 py-1.5 pl-1.5 pr-3.5 text-[13.5px] font-medium text-ink transition hover:border-crimson-200"
            >
              <Avatar firstName={user?.first_name} lastName={user?.last_name} size="xs" />
              <LayoutDashboard className="size-3.5 text-ink-faint" />
              Dashboard
            </button>
          ) : (
            <>
              <Link to="/tenant-portal/login" className="px-3 py-2 text-[13.5px] font-medium text-ink-soft transition hover:text-ink">
                Tenant login
              </Link>
              <Link to="/login" className="px-3 py-2 text-[13.5px] font-medium text-ink-soft transition hover:text-ink">
                Log in
              </Link>
              <Button size="sm" onClick={() => navigate('/get-started')}>List your property</Button>
            </>
          )}
        </div>

        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink lg:hidden">
          <Menu className="size-5.5" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden" />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col gap-1 bg-white p-5 shadow-2xl lg:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-lg font-semibold">Menu</span>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-ink-soft hover:bg-paper-dim"><X className="size-5" /></button>
              </div>
              {links.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper-dim hover:text-ink">
                  {l.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
                {isAuthenticated ? (
                  <Button onClick={() => { setOpen(false); navigate(isSuperAdmin ? '/super-admin' : '/dashboard'); }}>Go to dashboard</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => { setOpen(false); navigate('/login'); }}>Log in</Button>
                    <Button onClick={() => { setOpen(false); navigate('/get-started'); }}>List your property</Button>
                    <Link to="/tenant-portal/login" onClick={() => setOpen(false)} className="text-center text-xs font-medium text-ink-faint hover:text-ink-soft">
                      Tenant portal login
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
