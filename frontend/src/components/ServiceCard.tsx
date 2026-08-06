import { ChevronRight } from 'lucide-react';
import { ServiceCategory } from '../types';
import { getCategoryIcon } from '../utils/icons';
import PriceDisplay from './PriceDisplay';

interface ServiceCardProps {
  category: ServiceCategory;
  onClick?: () => void;
}

const ServiceCard = ({ category, onClick }: ServiceCardProps) => {
  const Icon = getCategoryIcon(category.icon || category.name);

  return (
    <button type="button" className="service-card card" onClick={onClick}>
      <span className="service-icon">
        <Icon size={22} />
      </span>
      <div>
        <h3>{category.name}</h3>
        <p className="muted-text">{category.description}</p>
        <PriceDisplay amount={category.basePrice} prefix="From" />
      </div>
      <ChevronRight size={18} className="service-arrow" />
    </button>
  );
};

export default ServiceCard;
