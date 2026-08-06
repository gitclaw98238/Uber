import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBookingStore } from '../store/bookingStore';
import LoadingSpinner from '../components/LoadingSpinner';
import BookingStatusBadge from '../components/BookingStatusBadge';
import PriceDisplay from '../components/PriceDisplay';
import { formatDateTime } from '../utils/format';
import { useAsyncData } from '../hooks/useAsyncData';

const BookingsListPage = () => {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const fetchBookings = useBookingStore((state) => state.fetchBookings);
  const { data: bookings, loading, error } = useAsyncData(() => fetchBookings({ scope: 'customer' }), [fetchBookings]);

  const filtered = useMemo(
    () =>
      (bookings || []).filter((booking) =>
        tab === 'upcoming' ? !['completed', 'cancelled'].includes(booking.status) : ['completed', 'cancelled'].includes(booking.status),
      ),
    [bookings, tab],
  );

  if (loading) return <LoadingSpinner label="Loading your bookings…" />;

  return (
    <div className="page stack-lg fade-in">
      <section className="tab-row card">
        <button type="button" className={`tab-button ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
          Upcoming
        </button>
        <button type="button" className={`tab-button ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>
          Past
        </button>
      </section>
      {error ? <div className="banner error">{error}</div> : null}
      <div className="stack-md">
        {filtered.map((booking) => (
          <Link key={booking.id} className="card booking-row" to={`/customer/bookings/${booking.id}`}>
            <div>
              <h3>{booking.category?.name || 'Service request'}</h3>
              <p className="muted-text">{formatDateTime(booking.scheduledFor || booking.createdAt)}</p>
            </div>
            <div className="booking-row-meta">
              <BookingStatusBadge status={booking.status} />
              <PriceDisplay amount={booking.estimate} />
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length ? <div className="empty-state card">No {tab} bookings yet.</div> : null}
    </div>
  );
};

export default BookingsListPage;
