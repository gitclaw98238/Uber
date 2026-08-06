import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { bookingsApi } from '../api/bookings';
import BookingStatusBadge from '../components/BookingStatusBadge';
import CountdownTimer from '../components/CountdownTimer';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceDisplay from '../components/PriceDisplay';
import { useAsyncData } from '../hooks/useAsyncData';
import { useBookingStore } from '../store/bookingStore';

const RequestCardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const updateStatus = useBookingStore((state) => state.updateStatus);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsyncData(
    async () => {
      if (id) {
        return { requests: [await bookingsApi.get(id)] };
      }
      const requests = await bookingsApi.list({ scope: 'provider', status: 'searching' });
      return { requests };
    },
    [id],
  );

  const requests = useMemo(() => (data?.requests || []).filter((request) => request.status === 'searching'), [data?.requests]);

  const handleAction = async (requestId: string, status: 'matched' | 'cancelled') => {
    setSubmitting(requestId + status);
    await updateStatus(requestId, status);
    setSubmitting(null);
    if (status === 'matched') {
      navigate('/provider/bookings');
      return;
    }
    await reload();
  };

  if (loading) return <LoadingSpinner label="Loading incoming requests…" />;

  return (
    <div className="page stack-lg fade-in">
      {error ? <div className="banner error">{error}</div> : null}
      {requests.map((request) => (
        <section key={request.id} className="card request-card stack-md">
          <div className="row-between wrap">
            <div>
              <p className="eyebrow">Incoming request</p>
              <h2>{request.category?.name || 'Service request'}</h2>
              <p className="muted-text">{request.address.line1}, {request.address.city}</p>
            </div>
            <CountdownTimer seconds={Math.max(15, 60 - Math.floor((Date.now() - new Date(request.createdAt).getTime()) / 1000))} />
          </div>
          <div className="detail-grid">
            <BookingStatusBadge status={request.status} />
            <PriceDisplay amount={request.estimate} prefix="Offer" />
            <span className="muted-text">Urgency: {request.urgency}</span>
          </div>
          <p>{request.notes || 'Customer did not leave extra notes.'}</p>
          <div className="row gap-sm wrap">
            <button className="button primary" type="button" disabled={submitting !== null} onClick={() => void handleAction(request.id, 'matched')}>
              {submitting === request.id + 'matched' ? 'Accepting…' : 'Accept'}
            </button>
            <button className="button ghost" type="button" disabled={submitting !== null} onClick={() => void handleAction(request.id, 'cancelled')}>
              Decline
            </button>
          </div>
        </section>
      ))}
      {!requests.length ? (
        <div className="empty-state card">
          No pending requests right now. <Link to="/provider/dashboard">Return to dashboard</Link>
        </div>
      ) : null}
    </div>
  );
};

export default RequestCardPage;
