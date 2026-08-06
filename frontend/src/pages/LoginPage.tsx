import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../utils/navigation';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, user, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', role: 'customer' });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const nextUser = await login(form);
      if (nextUser) navigate(getDefaultRouteForRole(nextUser.role), { replace: true });
    } catch (e) { /* error state handled by store */ }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card card fade-in">
        <p className="eyebrow">Uber for Services</p>
        <h1>Welcome back</h1>
        <p className="muted-text">Sign in to book trusted pros, manage jobs, or run marketplace operations.</p>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input value={form.email} onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))} type="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              value={form.password}
              onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
              type="password"
              required
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={form.role} onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))}>
              <option value="customer">Customer</option>
              <option value="provider">Provider</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {error ? <div className="banner error">{error}</div> : null}
          <button className="button primary full" type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-link-row">
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
