export type UserRole = 'customer' | 'provider' | 'admin';

export type BookingStatus =
  | 'draft'
  | 'searching'
  | 'quoted'
  | 'matched'
  | 'confirmed'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type UrgencyLevel = 'standard' | 'priority' | 'emergency';

export interface Address {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat?: number;
  lng?: number;
  instructions?: string;
}

export interface Payment {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  brand?: string;
  holderName?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
  createdAt?: string;
}

export interface CategoryQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'boolean' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  basePrice: number;
  questions: CategoryQuestion[];
}

export interface ProviderProfile {
  id: string;
  providerId: string;
  isOnline?: boolean;
  businessName: string;
  bio: string;
  description?: string;
  experienceYears: number;
  services: string[];
  rates: Record<string, number>;
  availability: Record<string, { enabled: boolean; start: string; end: string }>;
  portfolio: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  travelRadiusKm?: number;
  certifications?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  rating?: number;
  addresses?: Address[];
  paymentMethods?: Payment[];
  providerProfile?: ProviderProfile;
}

export interface Provider {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  categoryIds: string[];
  categoryNames?: string[];
  isOnline: boolean;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  serviceArea?: string;
  startingPrice: number;
  responseTimeMinutes?: number;
  distanceKm?: number;
  providerProfile?: ProviderProfile;
}

export interface Quote {
  id: string;
  bookingId: string;
  providerId: string;
  amount: number;
  description?: string;
  etaMinutes?: number;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  createdAt: string;
  readAt?: string;
  system?: boolean;
}

export interface Review {
  id: string;
  bookingId: string;
  providerId: string;
  customerId: string;
  rating: number;
  comment: string;
  createdAt: string;
  authorName?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'message' | 'booking' | 'system' | 'payment';
  isRead: boolean;
  createdAt: string;
  bookingId?: string;
  actionUrl?: string;
}

export interface Booking {
  id: string;
  customerId: string;
  providerId?: string;
  categoryId: string;
  status: BookingStatus;
  urgency: UrgencyLevel;
  estimate: number;
  scheduledFor?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  address: Address;
  location?: { lat: number; lng: number };
  answers: Record<string, unknown>;
  provider?: Provider;
  customer?: User;
  category?: ServiceCategory;
  quotes?: Quote[];
}

export interface Dispute {
  id: string;
  bookingId: string;
  openedBy: string;
  reason: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  booking?: Booking;
}

export interface ConversationSummary {
  bookingId: string;
  booking?: Booking;
  lastMessage?: Message;
  unreadCount: number;
  participantName?: string;
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface DashboardMetric {
  label: string;
  value: number | string;
  change?: string;
}

export interface AdminDashboardData {
  metrics: DashboardMetric[];
  bookingsByStatus: Array<{ status: BookingStatus; count: number }>;
  revenueByDay: Array<{ label: string; value: number }>;
}
