import { useState } from 'react';
import { adminApi } from '../api/admin';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAsyncData } from '../hooks/useAsyncData';

const AdminDisputesPage = () => {
  const { data: disputes, loading, error, reload } = useAsyncData(() => adminApi.getDisputes(), []);
  const [drafts, setDrafts] = useState<Record<string, { status: string; resolution: string }>>({});

  if (loading) return <LoadingSpinner label="Loading disputes…" />;

  return (
    <div className="page stack-lg fade-in">
      {error ? <div className="banner error">{error}</div> : null}
      {(disputes || []).map((dispute) => {
        const draft = drafts[dispute.id] || { status: dispute.status, resolution: dispute.resolution || '' };
        return (
          <section key={dispute.id} className="card stack-sm">
            <div className="row-between wrap">
              <div>
                <h3>Dispute #{dispute.id.slice(0, 8)}</h3>
                <p className="muted-text">Booking #{dispute.bookingId.slice(0, 8)}</p>
              </div>
              <strong>{dispute.status}</strong>
            </div>
            <p>{dispute.reason}</p>
            <label className="field">
              <span>Status</span>
              <select value={draft.status} onChange={(event) => setDrafts((current) => ({ ...current, [dispute.id]: { ...draft, status: event.target.value } }))}>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="field">
              <span>Resolution</span>
              <textarea value={draft.resolution} onChange={(event) => setDrafts((current) => ({ ...current, [dispute.id]: { ...draft, resolution: event.target.value } }))} />
            </label>
            <button className="button primary" type="button" onClick={async () => { await adminApi.resolveDispute(dispute.id, draft); await reload(); }}>
              Save resolution
            </button>
          </section>
        );
      })}
      {!disputes?.length ? <div className="empty-state card">No disputes to review.</div> : null}
    </div>
  );
};

export default AdminDisputesPage;
