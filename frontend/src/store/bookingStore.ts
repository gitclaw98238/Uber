import { create } from 'zustand';
import { bookingsApi, BookingFilters, CreateBookingInput } from '../api/bookings';
import { Booking, BookingStatus } from '../types';
import { getErrorMessage } from '../utils/errors';

interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
  isLoading: boolean;
  error: string | null;
  fetchBookings: (filters?: BookingFilters) => Promise<Booking[]>;
  fetchBooking: (id: string) => Promise<Booking>;
  createBooking: (payload: CreateBookingInput) => Promise<Booking>;
  updateStatus: (id: string, status: BookingStatus) => Promise<Booking>;
  upsertBooking: (booking: Booking) => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  currentBooking: null,
  isLoading: false,
  error: null,
  fetchBookings: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const bookings = await bookingsApi.list(filters);
      set({ bookings, isLoading: false });
      return bookings;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load bookings.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  fetchBooking: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const booking = await bookingsApi.get(id);
      get().upsertBooking(booking);
      set({ currentBooking: booking, isLoading: false });
      return booking;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load booking details.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  createBooking: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const booking = await bookingsApi.create(payload);
      set((state) => ({ bookings: [booking, ...state.bookings], currentBooking: booking, isLoading: false }));
      return booking;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to submit your request.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  updateStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const booking = await bookingsApi.updateStatus(id, status);
      get().upsertBooking(booking);
      set({ currentBooking: booking, isLoading: false });
      return booking;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to update booking status.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  upsertBooking: (booking) => {
    set((state) => ({
      bookings: state.bookings.some((item) => item.id === booking.id)
        ? state.bookings.map((item) => (item.id === booking.id ? booking : item))
        : [booking, ...state.bookings],
      currentBooking: state.currentBooking?.id === booking.id ? booking : state.currentBooking,
    }));
  },
}));
