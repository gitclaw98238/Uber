import { FormEvent, useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAsyncData } from '../hooks/useAsyncData';

const AdminSettingsPage = () => {
  const { data, loading, error, reload } = useAsyncData(() => adminApi.getSettings(), []);
  const [settings, setSettings] = useState<Record<string, string | number | boolean>>({
    platformFeePercent: 15,
    customerServiceSlaHours: 24,
    matchingWeightDistance: 0.5,
    matchingWeightRating: 0.3,
    matchingWeightPrice: 0.2,
  });
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await adminApi.updateSettings(settings);
    setSuccess('Settings saved.');
    await reload();
  };

  if (loading) return <LoadingSpinner label="Loading settings…" />;

  return (
    <div className="page fade-in">
      <form className="card form-stack" onSubmit={handleSubmit}>
        <h2>Platform settings</h2>
        {error ? <div className="banner error">{error}</div> : null}
        {success ? <div className="banner success">{success}</div> : null}
        {Object.entries(settings).map(([key, value]) => (
          <label className="field" key={key}>
            <span>{key}</span>
            <input value={String(value)} onChange={(event) => setSettings((current) => ({ ...current, [key]: Number.isNaN(Number(event.target.value)) ? event.target.value : Number(event.target.value) }))} />
          </label>
        ))}
        <button className="button primary" type="submit">Save settings</button>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
