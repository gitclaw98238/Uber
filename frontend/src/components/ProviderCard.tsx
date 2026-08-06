import { MapPin, Star } from 'lucide-react';
import { Provider } from '../types';
import Avatar from './Avatar';
import PriceDisplay from './PriceDisplay';

interface ProviderCardProps {
  provider: Provider;
  onClick?: () => void;
}

const ProviderCard = ({ provider, onClick }: ProviderCardProps) => (
  <button type="button" className="provider-card card" onClick={onClick}>
    <div className="provider-card-header">
      <Avatar user={{ name: provider.name, avatarUrl: provider.avatarUrl }} />
      <div className="provider-card-meta">
        <div className="row-between">
          <h3>{provider.name}</h3>
          <span className={`online-dot ${provider.isOnline ? 'is-online' : 'is-offline'}`} />
        </div>
        <p className="muted-text">{provider.providerProfile?.businessName || provider.categoryNames?.join(', ') || 'Service pro'}</p>
      </div>
    </div>
    <div className="provider-card-grid muted-text">
      <span>
        <Star size={16} /> {provider.rating.toFixed(1)} ({provider.reviewCount})
      </span>
      <span>
        <MapPin size={16} /> {provider.distanceKm ? `${provider.distanceKm.toFixed(1)} km` : provider.serviceArea || 'Nearby'}
      </span>
      <span>{provider.completedJobs}+ jobs</span>
      <PriceDisplay amount={provider.startingPrice} prefix="From" />
    </div>
  </button>
);

export default ProviderCard;
