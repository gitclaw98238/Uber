import { useState } from 'react';
import { adminApi } from '../api/admin';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAsyncData } from '../hooks/useAsyncData';

const AdminUsersPage = () => {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const { data: users, loading, error, reload } = useAsyncData(() => adminApi.getUsers({ search, role }), [search, role]);

  if (loading) return <LoadingSpinner label="Loading users…" />;

  return (
    <div className="page stack-lg fade-in">
      <section className="card form-grid two-cols">
        <label className="field"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></label>
        <label className="field">
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">All roles</option>
            <option value="customer">Customer</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <div className="full-span"><button className="button secondary" type="button" onClick={() => void reload()}>Refresh</button></div>
      </section>
      {error ? <div className="banner error">{error}</div> : null}
      <div className="table-card card">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th></tr></thead>
          <tbody>
            {(users || []).map((user) => (
              <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.phone || '—'}</td></tr>
            ))}
          </tbody>
        </table>
        {!users?.length ? <div className="empty-state">No users found.</div> : null}
      </div>
    </div>
  );
};

export default AdminUsersPage;
