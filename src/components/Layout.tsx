import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useAppStore } from '@/context';
import {
  LayoutDashboard,
  History,
  Settings,
  Users,
  ClipboardCheck,
  ListChecks,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { track } from '@/lib/analytics';
import { Separator } from '@/components/ui/separator';
import logoImg from '@/assets/auditflowslogo.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/audit', icon: ClipboardCheck, label: 'Audit' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/team', icon: Users, label: 'Team', adminOnly: true },
  { to: '/questions', icon: ListChecks, label: 'Questions', adminOnly: true },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout() {
  const { currentUser, company, loading } = useAppStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loadingSlow, setLoadingSlow] = useState(false);

  useEffect(() => {
    track({ name: 'page_view', properties: { path: location.pathname } });
  }, [location.pathname]);

  useEffect(() => {
    if (!loading) { setLoadingSlow(false); return; }
    const timer = setTimeout(() => setLoadingSlow(true), 10_000);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="AuditFlows" className="w-8 h-8 rounded-lg" />
              <span className="font-semibold text-sm">
                {company?.name || 'AuditFlows'}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.filter(item => !item.adminOnly || currentUser?.role === 'admin').map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>

        {mobileOpen && (
          <>
            <Separator />
            <nav aria-label="Mobile navigation" className="md:hidden bg-card px-4 pb-3 pt-2">
              {navItems.filter(item => !item.adminOnly || currentUser?.role === 'admin').map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent'
                    }`
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {loading ? <LoadingSpinner slow={loadingSlow} /> : <Outlet />}
      </main>

      <footer className="border-t border-border py-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          An <a href="https://investiturelabs.com" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">Investiture Labs</a> product
        </p>
      </footer>
    </div>
  );
}
