import { formatCurrency } from '../utils/format';

interface PriceDisplayProps {
  amount: number;
  prefix?: string;
}

const PriceDisplay = ({ amount, prefix }: PriceDisplayProps) => (
  <span className="price-display">
    {prefix ? `${prefix} ` : ''}
    {formatCurrency(amount)}
  </span>
);

export default PriceDisplay;
