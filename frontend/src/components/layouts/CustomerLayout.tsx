import { Bell, CalendarDays, Compass, Home, MessageSquare, User, Wifi, WifiOff } from 'lucide-react';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from '../BottomNav';
import { useNotificationStore } from '../../store/notificationStore';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { useAuth } from '../../context/AuthContext';

const CustomerLayout = () => {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const { status } = useWebSocketContext();
  const { user } = useAuth();

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="app-shell mobile-shell">
      <header className="topbar card">
        <div>
          <p className="eyebrow">Customer</p>
          <h1>Hello, {user?.name?.split(' ')[0] || 'there'}</h1>
        </div>
        <div className="topbar-icons">
          <span className="status-chip">{status === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}</span>
          <span className="status-chip">
            <Bell size={16} />
            {unreadCount > 0 ? <strong>{unreadCount}</strong> : null}
          </span>
        </div>
      </header>
      <main className="page-content with-bottom-nav">
        <Outlet />
      </main>
      <BottomNav
        items={[
          { label: 'Home', to: '/customer/home', icon: Home },
          { label: 'Explore', to: '/customer/home?section=explore', icon: Compass },
          { label: 'Bookings', to: '/customer/bookings', icon: CalendarDays },
          { label: 'Messages', to: '/customer/messages', icon: MessageSquare, badge: unreadCount || undefined },
          { label: 'Profile', to: '/customer/profile', icon: User },
        ]}
      />
    </div>
  );
};

export default CustomerLayout;
