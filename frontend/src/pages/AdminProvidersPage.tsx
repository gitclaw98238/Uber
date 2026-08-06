import { useState } from 'react';
import { adminApi } from '../api/admin';
import LoadingSpinner from '../components/LoadingSpinner';
import ProviderCard from '../components/ProviderCard';
import { useAsyncData } from '../hooks/useAsyncData';

const AdminProvidersPage = () => {
  const [search, setSearch] = useState('');
  const { data: providers, loading, error, reload } = useAsyncData(() => adminApi.getProviders({ search }), [search]);

  if (loading) return <LoadingSpinner label="Loading providers…" />;

  return (
    <div className="page stack-lg fade-in">
      <section className="card form-grid two-cols">
        <label className="field full-span"><span>Search providers</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Provider or business name" /></label>
      </section>
      {error ? <div className="banner error">{error}</div> : null}
      <div className="stack-md">
        {(providers || []).map((provider) => (
          <section key={provider.id} className="card stack-sm">
            <ProviderCard provider={provider} />
            <div className="row gap-sm wrap">
              <button className="button primary" type="button" onClick={async () => { await adminApi.verifyProvider(provider.id, 'verified'); await reload(); }}>
                Verify
              </button>
              <button className="button ghost" type="button" onClick={async () => { await adminApi.verifyProvider(provider.id, 'rejected'); await reload(); }}>
                Reject
              </button>
            </div>
          </section>
        ))}
      </div>
      {!providers?.length ? <div className="empty-state card">No providers found.</div> : null}
    </div>
  );
};

export default AdminProvidersPage;
