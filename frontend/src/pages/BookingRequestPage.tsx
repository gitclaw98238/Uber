import { FormEvent, useMemo, useState } from 'react';
import { LatLngLiteral } from 'leaflet';
import { useLocation, useNavigate } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import LocationPicker from '../components/LocationPicker';
import PriceDisplay from '../components/PriceDisplay';
import { useAsyncData } from '../hooks/useAsyncData';
import { useBookingStore } from '../store/bookingStore';
import { ServiceCategory } from '../types';
import { getErrorMessage } from '../utils/errors';

interface BookingDraftState {
  category?: ServiceCategory;
  answers?: Record<string, unknown>;
  urgency?: 'standard' | 'priority' | 'emergency';
  notes?: string;
}

const createId = () => window.crypto?.randomUUID?.() ?? `${Date.now()}`;

const BookingRequestPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { createBooking, isLoading, error } = useBookingStore();
  const draft = (location.state || {}) as BookingDraftState;
  const { data: categories } = useAsyncData(() => categoriesApi.list(), []);
  const [selectedCategoryId, setSelectedCategoryId] = useState(draft.category?.id || '');
  const [marker, setMarker] = useState<LatLngLiteral>({ lat: 40.7128, lng: -74.006 });
  const [scheduledFor, setScheduledFor] = useState('');
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
    instructions: '',
  });
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => draft.category || categories?.find((category) => category.id === selectedCategoryId) || null,
    [categories, draft.category, selectedCategoryId],
  );

  const estimate = useMemo(() => {
    const base = selectedCategory?.basePrice || 0;
    const urgency = draft.urgency || 'standard';
    const multiplier = urgency === 'emergency' ? 1.5 : urgency === 'priority' ? 1.2 : 1;
    return Math.round(base * multiplier);
  }, [draft.urgency, selectedCategory]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionError(null);

    try {
      const booking = await createBooking({
        categoryId: selectedCategory?.id || selectedCategoryId,
        address: {
          id: createId(),
          label: 'Service address',
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          instructions: address.instructions,
          lat: marker.lat,
          lng: marker.lng,
        },
        location: marker,
        answers: draft.answers || {},
        urgency: draft.urgency || 'standard',
        notes: draft.notes,
        estimate,
        scheduledFor: scheduledFor || undefined,
      });
      navigate(`/customer/searching?bookingId=${booking.id}`);
    } catch (requestError) {
      setSubmissionError(getErrorMessage(requestError, 'Unable to submit booking request.'));
    }
  };

  return (
    <div className="page stack-lg fade-in">
      <section className="card stack-sm">
        <h2>Confirm your request</h2>
        <p className="muted-text">Drop a pin, confirm the address, and we&apos;ll send your request to available providers.</p>
      </section>

      <form className="stack-lg" onSubmit={handleSubmit}>
        {!draft.category ? (
          <label className="field card">
            <span>Service category</span>
            <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} required>
              <option value="">Select a category</option>
              {(categories || []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <LocationPicker value={marker} onChange={setMarker} />

        <div className="card form-grid two-cols">
          <label className="field">
            <span>Address line 1</span>
            <input value={address.line1} onChange={(event) => setAddress((state) => ({ ...state, line1: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Address line 2</span>
            <input value={address.line2} onChange={(event) => setAddress((state) => ({ ...state, line2: event.target.value }))} />
          </label>
          <label className="field">
            <span>City</span>
            <input value={address.city} onChange={(event) => setAddress((state) => ({ ...state, city: event.target.value }))} required />
          </label>
          <label className="field">
            <span>State</span>
            <input value={address.state} onChange={(event) => setAddress((state) => ({ ...state, state: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Postal code</span>
            <input value={address.postalCode} onChange={(event) => setAddress((state) => ({ ...state, postalCode: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Preferred time</span>
            <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
          </label>
          <label className="field full-span">
            <span>Arrival instructions</span>
            <textarea
              value={address.instructions}
              onChange={(event) => setAddress((state) => ({ ...state, instructions: event.target.value }))}
              placeholder="Gate code, parking, or access details"
            />
          </label>
        </div>

        <section className="card row-between wrap">
          <div>
            <p className="muted-text">Estimated starting total</p>
            <PriceDisplay amount={estimate} />
          </div>
          <button className="button primary" type="submit" disabled={isLoading || !selectedCategory}>
            {isLoading ? 'Submitting…' : 'Request a provider'}
          </button>
        </section>

        {submissionError || error ? <div className="banner error">{submissionError || error}</div> : null}
      </form>
    </div>
  );
};

export default BookingRequestPage;
