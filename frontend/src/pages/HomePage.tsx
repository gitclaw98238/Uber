import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { categoriesApi } from '../api/categories';
import { providersApi } from '../api/providers';
import LoadingSpinner from '../components/LoadingSpinner';
import ProviderCard from '../components/ProviderCard';
import ServiceCard from '../components/ServiceCard';
import { useAsyncData } from '../hooks/useAsyncData';

const HomePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const [categories, providers] = await Promise.all([categoriesApi.list(), providersApi.list({ available: true })]);
      return { categories, providers };
    },
    [],
  );

  const filteredCategories = useMemo(() => {
    const term = query.toLowerCase();
    return (data?.categories || []).filter(
      (category) => !term || category.name.toLowerCase().includes(term) || category.description.toLowerCase().includes(term),
    );
  }, [data?.categories, query]);

  const filteredProviders = useMemo(() => {
    const term = query.toLowerCase();
    return (data?.providers || []).filter(
      (provider) =>
        !term ||
        provider.name.toLowerCase().includes(term) ||
        provider.categoryNames?.some((name) => name.toLowerCase().includes(term)) ||
        provider.serviceArea?.toLowerCase().includes(term),
    );
  }, [data?.providers, query]);

  if (loading) return <LoadingSpinner label="Loading nearby services…" />;

  return (
    <div className="page stack-lg fade-in">
      <section className="hero card gradient-card">
        <div>
          <p className="eyebrow">Book fast</p>
          <h2>Need help today?</h2>
          <p className="muted-text">Search services, answer a few questions, and we&apos;ll match you with a vetted pro.</p>
        </div>
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cleaning, moving, handyman…" />
        </label>
      </section>

      {error ? (
        <div className="banner error">
          {error} <button className="text-button" onClick={() => void reload()}>Retry</button>
        </div>
      ) : null}

      <section className="stack-md" id="explore">
        <div className="section-heading">
          <h3>Popular categories</h3>
          <button className="text-button" onClick={() => setQuery('')}>Clear</button>
        </div>
        <div className="grid responsive-grid">
          {filteredCategories.map((category) => (
            <ServiceCard key={category.id} category={category} onClick={() => navigate(`/customer/category/${category.id}`)} />
          ))}
        </div>
        {!filteredCategories.length ? <div className="empty-state card">No categories matched your search.</div> : null}
      </section>

      <section className="stack-md">
        <div className="section-heading">
          <h3>Available near you</h3>
          <span className="muted-text">Live availability from currently online pros</span>
        </div>
        <div className="grid responsive-grid">
          {filteredProviders.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} onClick={() => navigate(`/customer/providers/${provider.id}`)} />
          ))}
        </div>
        {!filteredProviders.length ? <div className="empty-state card">No nearby providers yet. Try broadening your search.</div> : null}
      </section>
    </div>
  );
};

export default HomePage;
