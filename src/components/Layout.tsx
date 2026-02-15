import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/context';
import {
  LayoutDashboard,
  History,
  Settings,
  Users,
  LogOut,
  ClipboardCheck,
  ListChecks,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { track } from '@/lib/analytics';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/audit', icon: ClipboardCheck, label: 'Audit' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/team', icon: Users, label: 'Team', adminOnly: true },
  { to: '/questions', icon: ListChecks, label: 'Questions', adminOnly: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout() {
  const { currentUser, company, logout, loading } = useAppStore();
  const navigate = useNavigate();
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

  const handleLogout = () => {
    track({ name: 'user_logout', properties: {} });
    logout();
    navigate('/login');
  };

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
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <ClipboardCheck size={18} className="text-primary-foreground" />
              </div>
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
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  style={{ backgroundColor: currentUser?.avatarColor }}
                  className="text-white text-xs font-semibold"
                >
                  {currentUser?.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm text-muted-foreground">
                {currentUser?.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </Button>
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
    </div>
  );
}
