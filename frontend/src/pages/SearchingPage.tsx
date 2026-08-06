import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { useBookingStore } from '../store/bookingStore';

const SearchingPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId');
  const { currentBooking, fetchBooking, isLoading, error } = useBookingStore();

  useEffect(() => {
    if (!bookingId) return;

    void fetchBooking(bookingId);
    const interval = window.setInterval(() => {
      void fetchBooking(bookingId);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [bookingId, fetchBooking]);

  useEffect(() => {
    if (currentBooking && !['draft', 'searching', 'quoted'].includes(currentBooking.status)) {
      navigate(`/customer/bookings/${currentBooking.id}`, { replace: true });
    }
  }, [currentBooking, navigate]);

  if (!bookingId) {
    return <div className="page"><div className="banner error">No active booking request was found.</div></div>;
  }

  return (
    <div className="page stack-lg fade-in">
      <section className="card center-card pulse-card">
        <div className="pulse-orb" />
        <h2>Finding available pros…</h2>
        <p className="muted-text">We&apos;re broadcasting your request to nearby providers. This page refreshes automatically.</p>
        {isLoading ? <LoadingSpinner label="Refreshing live match status…" /> : null}
        {error ? <div className="banner error">{error}</div> : null}
        <div className="row-center gap-sm">
          <Link className="button secondary" to={`/customer/bookings/${bookingId}`}>
            View request
          </Link>
          <Link className="button ghost" to="/customer/bookings">
            My bookings
          </Link>
        </div>
      </section>
    </div>
  );
};

export default SearchingPage;
