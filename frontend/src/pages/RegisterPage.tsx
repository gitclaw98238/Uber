import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../utils/navigation';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, user, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
    businessName: '',
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const nextUser = await register(form);
      if (nextUser) navigate(getDefaultRouteForRole(nextUser.role), { replace: true });
    } catch (e) { /* error state handled by store */ }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card card fade-in">
        <p className="eyebrow">Create account</p>
        <h1>Join the marketplace</h1>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-grid two-cols">
            <label className="field">
              <span>Full name</span>
              <input value={form.name} onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))} required />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={form.phone} onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))} />
            </label>
          </div>
          <label className="field">
            <span>Email</span>
            <input value={form.email} onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))} type="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input value={form.password} onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))} type="password" required />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={form.role} onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))}>
              <option value="customer">Customer</option>
              <option value="provider">Provider</option>
            </select>
          </label>
          {form.role === 'provider' ? (
            <label className="field">
              <span>Business name</span>
              <input
                value={form.businessName}
                onChange={(event) => setForm((state) => ({ ...state, businessName: event.target.value }))}
                required
              />
            </label>
          ) : null}
          {error ? <div className="banner error">{error}</div> : null}
          <button className="button primary full" type="submit" disabled={isLoading}>
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-link-row">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
