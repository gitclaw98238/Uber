import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { reviewsApi } from '../api/reviews';
import StarRating from '../components/StarRating';
import { getErrorMessage } from '../utils/errors';

const ReviewPage = () => {
  const { bookingId = '' } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await reviewsApi.createReview(bookingId, { rating, comment });
      navigate(`/customer/bookings/${bookingId}`);
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, 'Unable to submit review.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page fade-in">
      <form className="card form-stack" onSubmit={handleSubmit}>
        <p className="eyebrow">Booking #{bookingId.slice(0, 8)}</p>
        <h2>How did it go?</h2>
        <StarRating value={rating} onChange={setRating} size={24} />
        <label className="field">
          <span>Review</span>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share what stood out about the service" rows={5} />
        </label>
        {error ? <div className="banner error">{error}</div> : null}
        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit review'}
        </button>
      </form>
    </div>
  );
};

export default ReviewPage;
