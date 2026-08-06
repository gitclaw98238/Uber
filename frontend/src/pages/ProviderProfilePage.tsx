import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { providersApi } from '../api/providers';
import { reviewsApi } from '../api/reviews';
import Avatar from '../components/Avatar';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceDisplay from '../components/PriceDisplay';
import StarRating from '../components/StarRating';
import { useAsyncData } from '../hooks/useAsyncData';

const ProviderProfilePage = () => {
  const { id = '' } = useParams();
  const { data, loading, error } = useAsyncData(
    async () => {
      const [provider, reviews] = await Promise.all([providersApi.get(id), reviewsApi.listProviderReviews(id)]);
      return { provider, reviews };
    },
    [id],
  );

  const services = useMemo(() => data?.provider.providerProfile?.services || data?.provider.categoryNames || [], [data]);

  if (loading) return <LoadingSpinner label="Loading provider profile…" />;
  if (!data || error) return <div className="page"><div className="banner error">{error || 'Provider not found.'}</div></div>;

  const { provider, reviews } = data;

  return (
    <div className="page stack-lg fade-in">
      <section className="card stack-md">
        <div className="row gap-md align-center">
          <Avatar user={{ name: provider.name, avatarUrl: provider.avatarUrl }} size="lg" />
          <div>
            <h2>{provider.providerProfile?.businessName || provider.name}</h2>
            <p className="muted-text">{provider.providerProfile?.bio || provider.serviceArea || 'Trusted local professional'}</p>
            <div className="row gap-sm align-center">
              <StarRating value={provider.rating} />
              <span className="muted-text">{provider.reviewCount} reviews</span>
            </div>
          </div>
        </div>
        <div className="chip-row">
          {services.map((service) => (
            <span key={service} className="chip">
              {service}
            </span>
          ))}
        </div>
        <PriceDisplay amount={provider.startingPrice} prefix="Starting at" />
      </section>

      <section className="card stack-sm">
        <h3>Portfolio</h3>
        <div className="image-grid">
          {(provider.providerProfile?.portfolio || []).map((image) => (
            <img key={image} src={image} alt="Provider portfolio" className="portfolio-image" />
          ))}
          {!provider.providerProfile?.portfolio?.length ? <div className="empty-state">No portfolio uploaded yet.</div> : null}
        </div>
      </section>

      <section className="card stack-sm">
        <h3>Reviews</h3>
        {reviews.map((review) => (
          <article key={review.id} className="review-item">
            <div className="row-between wrap">
              <strong>{review.authorName || 'Customer'}</strong>
              <span className="muted-text">{new Date(review.createdAt).toLocaleDateString()}</span>
            </div>
            <StarRating value={review.rating} />
            <p>{review.comment}</p>
          </article>
        ))}
        {!reviews.length ? <div className="empty-state">No reviews yet.</div> : null}
      </section>
    </div>
  );
};

export default ProviderProfilePage;
