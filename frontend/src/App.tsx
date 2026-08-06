import { ReactElement, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminBookingsPage from './pages/AdminBookingsPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminDisputesPage from './pages/AdminDisputesPage';
import AdminProvidersPage from './pages/AdminProvidersPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import BookingDetailPage from './pages/BookingDetailPage';
import BookingRequestPage from './pages/BookingRequestPage';
import BookingsListPage from './pages/BookingsListPage';
import CategoryPage from './pages/CategoryPage';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import ProviderBookingsPage from './pages/ProviderBookingsPage';
import ProviderDashboardPage from './pages/ProviderDashboardPage';
import ProviderEarningsPage from './pages/ProviderEarningsPage';
import ProviderPortfolioPage from './pages/ProviderPortfolioPage';
import ProviderProfileEditPage from './pages/ProviderProfileEditPage';
import ProviderProfilePage from './pages/ProviderProfilePage';
import ProviderSchedulePage from './pages/ProviderSchedulePage';
import RegisterPage from './pages/RegisterPage';
import RequestCardPage from './pages/RequestCardPage';
import ReviewPage from './pages/ReviewPage';
import SearchingPage from './pages/SearchingPage';
import CustomerLayout from './components/layouts/CustomerLayout';
import ProviderLayout from './components/layouts/ProviderLayout';
import AdminLayout from './components/layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './context/AuthContext';
import { getDefaultRouteForRole } from './utils/navigation';

const RootRedirect = () => {
  const { isReady, isAuthenticated, user } = useAuth();

  if (!isReady) {
    return <LoadingSpinner label="Loading application…" fullPage />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
};

const PublicOnlyRoute = ({ children }: { children: ReactElement }) => {
  const { isReady, isAuthenticated, user } = useAuth();
  const redirectPath = useMemo(() => getDefaultRouteForRole(user?.role), [user?.role]);

  if (!isReady) {
    return <LoadingSpinner label="Loading application…" fullPage />;
  }

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

const App = () => (
  <Routes>
    <Route path="/" element={<RootRedirect />} />
    <Route
      path="/login"
      element={
        <PublicOnlyRoute>
          <LoginPage />
        </PublicOnlyRoute>
      }
    />
    <Route
      path="/register"
      element={
        <PublicOnlyRoute>
          <RegisterPage />
        </PublicOnlyRoute>
      }
    />

    <Route
      path="/customer"
      element={
        <ProtectedRoute roles={['customer']}>
          <CustomerLayout />
        </ProtectedRoute>
      }
    >
      <Route path="home" element={<HomePage />} />
      <Route path="category/:id" element={<CategoryPage />} />
      <Route path="book" element={<BookingRequestPage />} />
      <Route path="searching" element={<SearchingPage />} />
      <Route path="bookings" element={<BookingsListPage />} />
      <Route path="bookings/:id" element={<BookingDetailPage />} />
      <Route path="providers/:id" element={<ProviderProfilePage />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="messages/:bookingId" element={<ChatPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="review/:bookingId" element={<ReviewPage />} />
    </Route>

    <Route
      path="/provider"
      element={
        <ProtectedRoute roles={['provider']}>
          <ProviderLayout />
        </ProtectedRoute>
      }
    >
      <Route path="dashboard" element={<ProviderDashboardPage />} />
      <Route path="requests" element={<RequestCardPage />} />
      <Route path="requests/:id" element={<RequestCardPage />} />
      <Route path="bookings" element={<ProviderBookingsPage />} />
      <Route path="earnings" element={<ProviderEarningsPage />} />
      <Route path="profile" element={<ProviderProfileEditPage />} />
      <Route path="schedule" element={<ProviderSchedulePage />} />
      <Route path="portfolio" element={<ProviderPortfolioPage />} />
    </Route>

    <Route
      path="/admin"
      element={
        <ProtectedRoute roles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="providers" element={<AdminProvidersPage />} />
      <Route path="bookings" element={<AdminBookingsPage />} />
      <Route path="disputes" element={<AdminDisputesPage />} />
      <Route path="categories" element={<AdminCategoriesPage />} />
      <Route path="settings" element={<AdminSettingsPage />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
