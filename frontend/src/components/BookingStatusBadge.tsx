import { BookingStatus } from '../types';
import { bookingStatusLabel } from '../utils/format';

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

const BookingStatusBadge = ({ status }: BookingStatusBadgeProps) => (
  <span className={`status-badge status-${status}`}>{bookingStatusLabel(status)}</span>
);

export default BookingStatusBadge;
