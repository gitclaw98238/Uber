import { useMemo, useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { useBookingStore } from '../store/bookingStore';
import LoadingSpinner from '../components/LoadingSpinner';
import BookingStatusBadge from '../components/BookingStatusBadge';
import PriceDisplay from '../components/PriceDisplay';
import { BookingStatus } from '../types';

const nextStatusFor = (status: BookingStatus): BookingStatus | null => {
  if (status === 'matched' || status === 'confirmed') return 'en_route';
  if (status === 'en_route') return 'in_progress';
  if (status === 'in_progress') return 'completed';
  return null;
};

const ProviderBookingsPage = () => {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const fetchBookings = useBookingStore((state) => state.fetchBookings);
  const updateStatus = useBookingStore((state) => state.updateStatus);
  const { data: bookings, loading, error, reload } = useAsyncData(() => fetchBookings({ scope: 'provider' }), [fetchBookings]);

  const filtered = useMemo(
    () =>
      (bookings || []).filter((booking) =>
        tab === 'active' ? !['completed', 'cancelled'].includes(booking.status) : ['completed', 'cancelled'].includes(booking.status),
      ),
    [bookings, tab],
  );

  if (loading) return <LoadingSpinner label="Loading jobs…" />;

  return (
    <div className="page stack-lg fade-in">
      <section className="tab-row card">
        <button className={`tab-button ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')} type="button">Active</button>
        <button className={`tab-button ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')} type="button">Completed</button>
      </section>
      {error ? <div className="banner error">{error}</div> : null}
      <div className="stack-md">
        {filtered.map((booking) => {
          const nextStatus = nextStatusFor(booking.status);
          return (
            <section key={booking.id} className="card stack-sm">
              <div className="row-between wrap">
                <div>
                  <h3>{booking.category?.name || 'Service request'}</h3>
                  <p className="muted-text">{booking.address.line1}, {booking.address.city}</p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>
              <div className="row-between wrap">
                <PriceDisplay amount={booking.estimate} />
                {nextStatus ? (
                  <button
                    className="button secondary"
                    type="button"
                    onClick={async () => {
                      await updateStatus(booking.id, nextStatus);
                      await reload();
                    }}
                  >
                    Mark {nextStatus.replace(/_/g, ' ')}
                  </button>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
      {!filtered.length ? <div className="empty-state card">No {tab} jobs.</div> : null}
    </div>
  );
};

export default ProviderBookingsPage;
