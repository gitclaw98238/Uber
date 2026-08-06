import { useState } from 'react';
import { adminApi } from '../api/admin';
import BookingStatusBadge from '../components/BookingStatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceDisplay from '../components/PriceDisplay';
import { useAsyncData } from '../hooks/useAsyncData';

const AdminBookingsPage = () => {
  const [status, setStatus] = useState('');
  const { data: bookings, loading, error } = useAsyncData(() => adminApi.getBookings({ status: status || undefined }), [status]);

  if (loading) return <LoadingSpinner label="Loading all bookings…" />;

  return (
    <div className="page stack-lg fade-in">
      <section className="card">
        <label className="field">
          <span>Status filter</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            <option value="searching">Searching</option>
            <option value="matched">Matched</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </section>
      {error ? <div className="banner error">{error}</div> : null}
      <div className="table-card card">
        <table className="data-table">
          <thead><tr><th>Booking</th><th>Customer</th><th>Provider</th><th>Status</th><th>Estimate</th></tr></thead>
          <tbody>
            {(bookings || []).map((booking) => (
              <tr key={booking.id}>
                <td>{booking.category?.name || booking.id.slice(0, 8)}</td>
                <td>{booking.customer?.name || booking.customerId}</td>
                <td>{booking.provider?.name || booking.providerId || 'Unassigned'}</td>
                <td><BookingStatusBadge status={booking.status} /></td>
                <td><PriceDisplay amount={booking.estimate} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!bookings?.length ? <div className="empty-state">No bookings found.</div> : null}
      </div>
    </div>
  );
};

export default AdminBookingsPage;
