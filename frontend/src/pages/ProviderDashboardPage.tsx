import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAsyncData } from '../hooks/useAsyncData';
import { useProviderStore } from '../store/providerStore';
import { useBookingStore } from '../store/bookingStore';
import LoadingSpinner from '../components/LoadingSpinner';
import BookingStatusBadge from '../components/BookingStatusBadge';
import PriceDisplay from '../components/PriceDisplay';

const ProviderDashboardPage = () => {
  const fetchMyProviderProfile = useProviderStore((state) => state.fetchMyProviderProfile);
  const toggleOnline = useProviderStore((state) => state.toggleOnline);
  const fetchBookings = useBookingStore((state) => state.fetchBookings);
  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const [profile, bookings] = await Promise.all([fetchMyProviderProfile(), fetchBookings({ scope: 'provider' })]);
      return { profile, bookings };
    },
    [fetchMyProviderProfile, fetchBookings],
  );

  const stats = useMemo(() => {
    const bookings = data?.bookings || [];
    const today = new Date().toDateString();
    const todayBookings = bookings.filter((booking) => new Date(booking.createdAt).toDateString() === today);
    const revenue = bookings.filter((booking) => booking.status === 'completed').reduce((sum, booking) => sum + booking.estimate, 0);
    return {
      todayJobs: todayBookings.length,
      activeJobs: bookings.filter((booking) => !['completed', 'cancelled'].includes(booking.status)).length,
      revenue,
    };
  }, [data?.bookings]);

  if (loading) return <LoadingSpinner label="Loading provider dashboard…" />;

  return (
    <div className="page stack-lg fade-in">
      <section className="card row-between wrap">
        <div>
          <p className="eyebrow">Availability</p>
          <h2>{data?.profile.isOnline ? 'You are online' : 'You are offline'}</h2>
          <p className="muted-text">Toggle your status to start receiving nearby requests.</p>
        </div>
        <button
          className={`button ${data?.profile.isOnline ? 'secondary' : 'primary'}`}
          type="button"
          onClick={async () => {
            if (!data?.profile) return;
            await toggleOnline(!data.profile.isOnline);
            await reload();
          }}
        >
          {data?.profile.isOnline ? 'Go offline' : 'Go online'}
        </button>
      </section>

      {error ? <div className="banner error">{error}</div> : null}

      <section className="stats-grid">
        <div className="card stat-card"><span>Today&apos;s jobs</span><strong>{stats.todayJobs}</strong></div>
        <div className="card stat-card"><span>Active jobs</span><strong>{stats.activeJobs}</strong></div>
        <div className="card stat-card"><span>Total earnings</span><strong><PriceDisplay amount={stats.revenue} /></strong></div>
      </section>

      <section className="card stack-sm">
        <div className="section-heading">
          <h3>Upcoming jobs</h3>
          <Link className="text-button" to="/provider/bookings">View all</Link>
        </div>
        {(data?.bookings || [])
          .filter((booking) => !['completed', 'cancelled'].includes(booking.status))
          .slice(0, 5)
          .map((booking) => (
            <div key={booking.id} className="list-row">
              <div>
                <strong>{booking.category?.name || 'Service request'}</strong>
                <p className="muted-text">{booking.address.city}, {booking.address.state}</p>
              </div>
              <div className="row gap-sm align-center">
                <BookingStatusBadge status={booking.status} />
                <PriceDisplay amount={booking.estimate} />
              </div>
            </div>
          ))}
        {!data?.bookings?.length ? <div className="empty-state">No bookings yet.</div> : null}
      </section>
    </div>
  );
};

export default ProviderDashboardPage;
