import { FormEvent, useEffect, useState } from 'react';
import { paymentsApi } from '../api/payments';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAsyncData } from '../hooks/useAsyncData';
import { useAuth } from '../context/AuthContext';
import { Address } from '../types';

const emptyAddress = { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'USA' };
const createId = () => window.crypto?.randomUUID?.() ?? `${Date.now()}`;

const ProfilePage = () => {
  const { user, updateProfile, isLoading, error } = useAuth();
  const { data: paymentMethods, reload, loading: loadingPayments, error: paymentsError } = useAsyncData(() => paymentsApi.listMethods(), []);
  const [profile, setProfile] = useState({ name: '', phone: '', avatarUrl: '' });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddress, setNewAddress] = useState(emptyAddress);
  const [paymentForm, setPaymentForm] = useState({ brand: '', holderName: '', last4: '', expiryMonth: '', expiryYear: '' });
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || '', phone: user.phone || '', avatarUrl: user.avatarUrl || '' });
      setAddresses(user.addresses || []);
    }
  }, [user]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    await updateProfile({ ...user, ...profile, addresses });
    setSuccess('Profile updated successfully.');
  };

  const addAddress = () => {
    if (!newAddress.line1 || !newAddress.city || !newAddress.state || !newAddress.postalCode) return;
    setAddresses((current) => [...current, { id: createId(), label: 'Saved address', ...newAddress }]);
    setNewAddress(emptyAddress);
  };

  const addPaymentMethod = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await paymentsApi.addMethod({
      id: createId(),
      type: 'card',
      brand: paymentForm.brand,
      holderName: paymentForm.holderName,
      last4: paymentForm.last4,
      expiryMonth: Number(paymentForm.expiryMonth),
      expiryYear: Number(paymentForm.expiryYear),
    });
    setPaymentForm({ brand: '', holderName: '', last4: '', expiryMonth: '', expiryYear: '' });
    await reload();
  };

  const removePaymentMethod = async (id: string) => {
    await paymentsApi.removeMethod(id);
    await reload();
  };

  if (!user) return <LoadingSpinner label="Loading profile…" />;

  return (
    <div className="page stack-lg fade-in">
      <form className="card form-stack" onSubmit={handleProfileSubmit}>
        <h2>Profile</h2>
        <div className="form-grid two-cols">
          <label className="field">
            <span>Name</span>
            <input value={profile.name} onChange={(event) => setProfile((state) => ({ ...state, name: event.target.value }))} required />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={profile.phone} onChange={(event) => setProfile((state) => ({ ...state, phone: event.target.value }))} />
          </label>
          <label className="field full-span">
            <span>Avatar URL</span>
            <input value={profile.avatarUrl} onChange={(event) => setProfile((state) => ({ ...state, avatarUrl: event.target.value }))} />
          </label>
        </div>
        {success ? <div className="banner success">{success}</div> : null}
        {error ? <div className="banner error">{error}</div> : null}
        <button className="button primary" type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <section className="card stack-md">
        <h3>Saved addresses</h3>
        <div className="stack-sm">
          {addresses.map((address) => (
            <div key={address.id} className="list-row">
              <div>
                <strong>{address.label || 'Address'}</strong>
                <p className="muted-text">
                  {address.line1}, {address.city}, {address.state} {address.postalCode}
                </p>
              </div>
              <button className="text-button" type="button" onClick={() => setAddresses((current) => current.filter((item) => item.id !== address.id))}>
                Remove
              </button>
            </div>
          ))}
          {!addresses.length ? <div className="empty-state">No saved addresses yet.</div> : null}
        </div>
        <div className="form-grid two-cols">
          <label className="field"><span>Line 1</span><input value={newAddress.line1} onChange={(event) => setNewAddress((state) => ({ ...state, line1: event.target.value }))} /></label>
          <label className="field"><span>Line 2</span><input value={newAddress.line2} onChange={(event) => setNewAddress((state) => ({ ...state, line2: event.target.value }))} /></label>
          <label className="field"><span>City</span><input value={newAddress.city} onChange={(event) => setNewAddress((state) => ({ ...state, city: event.target.value }))} /></label>
          <label className="field"><span>State</span><input value={newAddress.state} onChange={(event) => setNewAddress((state) => ({ ...state, state: event.target.value }))} /></label>
          <label className="field"><span>Postal code</span><input value={newAddress.postalCode} onChange={(event) => setNewAddress((state) => ({ ...state, postalCode: event.target.value }))} /></label>
        </div>
        <button className="button secondary" type="button" onClick={addAddress}>Add address</button>
      </section>

      <section className="card stack-md">
        <h3>Payment methods</h3>
        {loadingPayments ? <LoadingSpinner label="Loading payment methods…" /> : null}
        {paymentsError ? <div className="banner error">{paymentsError}</div> : null}
        <div className="stack-sm">
          {(paymentMethods || []).map((paymentMethod) => (
            <div key={paymentMethod.id} className="list-row">
              <div>
                <strong>{paymentMethod.brand || 'Card'} •••• {paymentMethod.last4}</strong>
                <p className="muted-text">{paymentMethod.expiryMonth}/{paymentMethod.expiryYear}</p>
              </div>
              <button className="text-button" type="button" onClick={() => void removePaymentMethod(paymentMethod.id)}>
                Remove
              </button>
            </div>
          ))}
          {!paymentMethods?.length ? <div className="empty-state">No payment methods saved.</div> : null}
        </div>
        <form className="form-grid two-cols" onSubmit={addPaymentMethod}>
          <label className="field"><span>Brand</span><input value={paymentForm.brand} onChange={(event) => setPaymentForm((state) => ({ ...state, brand: event.target.value }))} required /></label>
          <label className="field"><span>Cardholder</span><input value={paymentForm.holderName} onChange={(event) => setPaymentForm((state) => ({ ...state, holderName: event.target.value }))} required /></label>
          <label className="field"><span>Last 4</span><input value={paymentForm.last4} maxLength={4} onChange={(event) => setPaymentForm((state) => ({ ...state, last4: event.target.value }))} required /></label>
          <label className="field"><span>Expiry month</span><input value={paymentForm.expiryMonth} onChange={(event) => setPaymentForm((state) => ({ ...state, expiryMonth: event.target.value }))} required /></label>
          <label className="field"><span>Expiry year</span><input value={paymentForm.expiryYear} onChange={(event) => setPaymentForm((state) => ({ ...state, expiryYear: event.target.value }))} required /></label>
          <div className="full-span">
            <button className="button primary" type="submit">Add payment method</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ProfilePage;
