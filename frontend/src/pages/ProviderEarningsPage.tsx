import { useMemo } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { useBookingStore } from '../store/bookingStore';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceDisplay from '../components/PriceDisplay';
import { formatShortDate } from '../utils/format';

const ProviderEarningsPage = () => {
  const fetchBookings = useBookingStore((state) => state.fetchBookings);
  const { data: bookings, loading, error } = useAsyncData(() => fetchBookings({ scope: 'provider' }), [fetchBookings]);

  const completedBookings = useMemo(() => (bookings || []).filter((booking) => booking.status === 'completed'), [bookings]);
  const total = completedBookings.reduce((sum, booking) => sum + booking.estimate, 0);
  const average = completedBookings.length ? Math.round(total / completedBookings.length) : 0;
  const weekly = completedBookings
    .filter((booking) => Date.now() - new Date(booking.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, booking) => sum + booking.estimate, 0);

  const chartData = completedBookings.slice(-6).map((booking) => ({
    label: formatShortDate(booking.updatedAt),
    value: booking.estimate,
  }));

  if (loading) return <LoadingSpinner label="Loading earnings…" />;

  return (
    <div className="page stack-lg fade-in">
      {error ? <div className="banner error">{error}</div> : null}
      <section className="stats-grid">
        <div className="card stat-card"><span>Total earnings</span><strong><PriceDisplay amount={total} /></strong></div>
        <div className="card stat-card"><span>This week</span><strong><PriceDisplay amount={weekly} /></strong></div>
        <div className="card stat-card"><span>Average ticket</span><strong><PriceDisplay amount={average} /></strong></div>
      </section>
      <section className="card stack-sm">
        <h3>Earnings history</h3>
        <div className="bar-chart">
          {chartData.map((item) => (
            <div key={item.label} className="bar-item">
              <div className="bar" style={{ height: `${Math.max(20, (item.value / Math.max(total, 1)) * 220)}px` }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        {!chartData.length ? <div className="empty-state">No completed jobs yet.</div> : null}
      </section>
    </div>
  );
};

export default ProviderEarningsPage;
