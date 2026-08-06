import { FormEvent, useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAsyncData } from '../hooks/useAsyncData';
import { useProviderStore } from '../store/providerStore';

const ProviderProfileEditPage = () => {
  const fetchMyProviderProfile = useProviderStore((state) => state.fetchMyProviderProfile);
  const updateMyProviderProfile = useProviderStore((state) => state.updateMyProviderProfile);
  const { data: profile, loading, error, reload } = useAsyncData(() => fetchMyProviderProfile(), [fetchMyProviderProfile]);
  const [form, setForm] = useState({
    businessName: '',
    bio: '',
    experienceYears: '0',
    services: '',
    travelRadiusKm: '10',
  });
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName || '',
        bio: profile.bio || '',
        experienceYears: String(profile.experienceYears || 0),
        services: profile.services.join(', '),
        travelRadiusKm: String(profile.travelRadiusKm || 10),
      });
    }
  }, [profile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await updateMyProviderProfile({
      businessName: form.businessName,
      bio: form.bio,
      experienceYears: Number(form.experienceYears),
      services: form.services.split(',').map((service) => service.trim()).filter(Boolean),
      travelRadiusKm: Number(form.travelRadiusKm),
    });
    setSuccess('Profile saved.');
    await reload();
  };

  if (loading) return <LoadingSpinner label="Loading provider profile…" />;

  return (
    <div className="page fade-in">
      <form className="card form-stack" onSubmit={handleSubmit}>
        <h2>Edit business profile</h2>
        {error ? <div className="banner error">{error}</div> : null}
        {success ? <div className="banner success">{success}</div> : null}
        <label className="field"><span>Business name</span><input value={form.businessName} onChange={(event) => setForm((state) => ({ ...state, businessName: event.target.value }))} required /></label>
        <label className="field"><span>Short bio</span><textarea value={form.bio} onChange={(event) => setForm((state) => ({ ...state, bio: event.target.value }))} rows={4} /></label>
        <div className="form-grid two-cols">
          <label className="field"><span>Experience (years)</span><input type="number" value={form.experienceYears} onChange={(event) => setForm((state) => ({ ...state, experienceYears: event.target.value }))} /></label>
          <label className="field"><span>Travel radius (km)</span><input type="number" value={form.travelRadiusKm} onChange={(event) => setForm((state) => ({ ...state, travelRadiusKm: event.target.value }))} /></label>
        </div>
        <label className="field"><span>Services offered</span><textarea value={form.services} onChange={(event) => setForm((state) => ({ ...state, services: event.target.value }))} placeholder="Plumbing, drain cleaning, leak repair" /></label>
        <div className="row gap-sm wrap">
          <button className="button primary" type="submit">Save profile</button>
          <a className="button ghost" href="/provider/portfolio">Edit portfolio</a>
        </div>
      </form>
    </div>
  );
};

export default ProviderProfileEditPage;
