import { BellRing, CalendarDays, LayoutDashboard, User, Wallet } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import BottomNav from '../BottomNav';
import { useAuth } from '../../context/AuthContext';

const ProviderLayout = () => {
  const { user } = useAuth();

  return (
    <div className="app-shell mobile-shell">
      <header className="topbar card">
        <div>
          <p className="eyebrow">Provider Console</p>
          <h1>{user?.providerProfile?.businessName || user?.name || 'Your business'}</h1>
        </div>
      </header>
      <main className="page-content with-bottom-nav">
        <Outlet />
      </main>
      <BottomNav
        items={[
          { label: 'Dashboard', to: '/provider/dashboard', icon: LayoutDashboard },
          { label: 'Requests', to: '/provider/requests', icon: BellRing },
          { label: 'Schedule', to: '/provider/schedule', icon: CalendarDays },
          { label: 'Earnings', to: '/provider/earnings', icon: Wallet },
          { label: 'Profile', to: '/provider/profile', icon: User },
        ]}
      />
    </div>
  );
};

export default ProviderLayout;
