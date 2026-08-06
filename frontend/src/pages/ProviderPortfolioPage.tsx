import { FormEvent, useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAsyncData } from '../hooks/useAsyncData';
import { useProviderStore } from '../store/providerStore';

const ProviderPortfolioPage = () => {
  const fetchMyProviderProfile = useProviderStore((state) => state.fetchMyProviderProfile);
  const updateMyProviderProfile = useProviderStore((state) => state.updateMyProviderProfile);
  const { data: profile, loading, error } = useAsyncData(() => fetchMyProviderProfile(), [fetchMyProviderProfile]);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    if (profile) {
      setPortfolio(profile.portfolio || []);
    }
  }, [profile]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await updateMyProviderProfile({ portfolio });
    setNewUrl('');
  };

  if (loading) return <LoadingSpinner label="Loading portfolio…" />;

  return (
    <div className="page fade-in">
      <form className="card form-stack" onSubmit={handleSave}>
        <h2>Portfolio</h2>
        {error ? <div className="banner error">{error}</div> : null}
        <div className="image-grid">
          {portfolio.map((image) => (
            <div key={image} className="portfolio-tile">
              <img src={image.startsWith('http') || image.startsWith('/') ? image : ''} alt="Portfolio work" className="portfolio-image" />
              <button className="button ghost" type="button" onClick={() => setPortfolio((current) => current.filter((item) => item !== image))}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <label className="field">
          <span>Add image URL</span>
          <input value={newUrl} onChange={(event) => setNewUrl(event.target.value)} placeholder="https://example.com/project.jpg" />
        </label>
        <div className="row gap-sm wrap">
          <button className="button secondary" type="button" onClick={() => newUrl && setPortfolio((current) => [...current, newUrl])}>
            Add image
          </button>
          <button className="button primary" type="submit">Save portfolio</button>
        </div>
      </form>
    </div>
  );
};

export default ProviderPortfolioPage;
