import { Link, useParams } from 'react-router-dom';
import { bookingsApi } from '../api/bookings';
import BookingStatusBadge from '../components/BookingStatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import MapView from '../components/MapView';
import PriceDisplay from '../components/PriceDisplay';
import ProviderCard from '../components/ProviderCard';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime } from '../utils/format';

const BookingDetailPage = () => {
  const { id = '' } = useParams();
  const { data: booking, loading, error } = useAsyncData(() => bookingsApi.get(id), [id]);

  if (loading) return <LoadingSpinner label="Loading booking details…" />;
  if (!booking || error) return <div className="page"><div className="banner error">{error || 'Booking not found.'}</div></div>;

  return (
    <div className="page stack-lg fade-in">
      <section className="card stack-sm">
        <div className="row-between wrap">
          <div>
            <p className="eyebrow">Booking #{booking.id.slice(0, 8)}</p>
            <h2>{booking.category?.name || 'Service request'}</h2>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>
        <div className="detail-grid muted-text">
          <span>Scheduled: {formatDateTime(booking.scheduledFor || booking.createdAt)}</span>
          <PriceDisplay amount={booking.estimate} prefix="Estimate" />
          <span>Urgency: {booking.urgency}</span>
        </div>
      </section>

      {booking.provider ? (
        <section className="stack-sm">
          <div className="section-heading">
            <h3>Your provider</h3>
            <Link className="text-button" to={`/customer/providers/${booking.provider.id}`}>
              View profile
            </Link>
          </div>
          <ProviderCard provider={booking.provider} />
        </section>
      ) : null}

      {booking.location ? <MapView center={booking.location} /> : null}

      <section className="card stack-sm">
        <h3>Status updates</h3>
        <ul className="timeline-list">
          <li>Request submitted • {formatDateTime(booking.createdAt)}</li>
          <li>Current status • {booking.status.replace(/_/g, ' ')}</li>
          {booking.updatedAt ? <li>Last updated • {formatDateTime(booking.updatedAt)}</li> : null}
        </ul>
      </section>

      <section className="row-between wrap">
        <Link className="button primary" to={`/customer/messages/${booking.id}`}>
          Open chat
        </Link>
        {booking.status === 'completed' ? (
          <Link className="button secondary" to={`/customer/review/${booking.id}`}>
            Leave a review
          </Link>
        ) : null}
      </section>
    </div>
  );
};

export default BookingDetailPage;
