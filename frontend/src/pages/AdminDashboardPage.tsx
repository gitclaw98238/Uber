import { adminApi } from '../api/admin';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceDisplay from '../components/PriceDisplay';
import { useAsyncData } from '../hooks/useAsyncData';

const AdminDashboardPage = () => {
  const { data, loading, error } = useAsyncData(() => adminApi.getDashboard(), []);

  if (loading) return <LoadingSpinner label="Loading admin dashboard…" />;

  return (
    <div className="page stack-lg fade-in">
      {error ? <div className="banner error">{error}</div> : null}
      <section className="stats-grid">
        {(data?.metrics || []).map((metric) => (
          <div key={metric.label} className="card stat-card">
            <span>{metric.label}</span>
            <strong>{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}</strong>
            {metric.change ? <small>{metric.change}</small> : null}
          </div>
        ))}
      </section>
      <section className="card stack-sm">
        <h3>Booking distribution</h3>
        {(data?.bookingsByStatus || []).map((item) => (
          <div key={item.status} className="list-row">
            <span>{item.status.replace(/_/g, ' ')}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </section>
      <section className="card stack-sm">
        <h3>Revenue trend</h3>
        <div className="bar-chart">
          {(data?.revenueByDay || []).map((point) => (
            <div key={point.label} className="bar-item">
              <div className="bar" style={{ height: `${Math.max(20, point.value)}px` }} />
              <span>{point.label}</span>
              <small><PriceDisplay amount={point.value} /></small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
