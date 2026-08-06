import { FormEvent, useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAsyncData } from '../hooks/useAsyncData';
import { useProviderStore } from '../store/providerStore';
import { ProviderProfile } from '../types';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultAvailability = weekdays.reduce<ProviderProfile['availability']>((accumulator, day) => {
  accumulator[day] = { enabled: day !== 'Sunday', start: '08:00', end: '18:00' };
  return accumulator;
}, {} as ProviderProfile['availability']);

const ProviderSchedulePage = () => {
  const fetchMyProviderProfile = useProviderStore((state) => state.fetchMyProviderProfile);
  const updateMyProviderProfile = useProviderStore((state) => state.updateMyProviderProfile);
  const { data: profile, loading, error } = useAsyncData(() => fetchMyProviderProfile(), [fetchMyProviderProfile]);
  const [availability, setAvailability] = useState<ProviderProfile['availability']>(defaultAvailability);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.availability) {
      setAvailability({ ...defaultAvailability, ...profile.availability });
    }
  }, [profile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await updateMyProviderProfile({ availability });
    setSuccess('Schedule updated.');
  };

  if (loading) return <LoadingSpinner label="Loading schedule…" />;

  return (
    <div className="page fade-in">
      <form className="card form-stack" onSubmit={handleSubmit}>
        <h2>Weekly availability</h2>
        {error ? <div className="banner error">{error}</div> : null}
        {success ? <div className="banner success">{success}</div> : null}
        {weekdays.map((day) => (
          <div key={day} className="schedule-row">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={availability[day]?.enabled ?? false}
                onChange={(event) =>
                  setAvailability((current) => ({
                    ...current,
                    [day]: { ...current[day], enabled: event.target.checked },
                  }))
                }
              />
              <span>{day}</span>
            </label>
            <input
              type="time"
              value={availability[day]?.start || '08:00'}
              onChange={(event) => setAvailability((current) => ({ ...current, [day]: { ...current[day], start: event.target.value } }))}
            />
            <input
              type="time"
              value={availability[day]?.end || '18:00'}
              onChange={(event) => setAvailability((current) => ({ ...current, [day]: { ...current[day], end: event.target.value } }))}
            />
          </div>
        ))}
        <button className="button primary" type="submit">Save schedule</button>
      </form>
    </div>
  );
};

export default ProviderSchedulePage;
