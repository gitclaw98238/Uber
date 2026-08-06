import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}

const StarRating = ({ value, onChange, size = 20 }: StarRatingProps) => {
  const interactive = Boolean(onChange);

  return (
    <div className="star-rating" role={interactive ? 'radiogroup' : undefined}>
      {Array.from({ length: 5 }, (_, index) => {
        const ratingValue = index + 1;
        const filled = ratingValue <= Math.round(value);
        return (
          <button
            key={ratingValue}
            type="button"
            className={`star-button ${filled ? 'is-filled' : ''}`}
            onClick={() => onChange?.(ratingValue)}
            disabled={!interactive}
            aria-label={`Rate ${ratingValue} star${ratingValue > 1 ? 's' : ''}`}
          >
            <Star size={size} fill={filled ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
