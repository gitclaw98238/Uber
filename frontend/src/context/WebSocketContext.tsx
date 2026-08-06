import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { Message, Notification, Booking } from '../types';
import { useChatStore } from '../store/chatStore';
import { useNotificationStore } from '../store/notificationStore';
import { useBookingStore } from '../store/bookingStore';

interface WebSocketContextValue {
  status: 'idle' | 'connecting' | 'connected' | 'reconnecting';
  send: (payload: Record<string, unknown>) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export const WebSocketProvider = ({ children }: PropsWithChildren) => {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const [status, setStatus] = useState<WebSocketContextValue['status']>('idle');

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setStatus('idle');
      socketRef.current?.close();
      return;
    }

    let cancelled = false;

    const connect = () => {
      setStatus((current) => (current === 'connected' ? current : 'connecting'));
      const wsBase = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
      const socket = new WebSocket(`${wsBase}?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!cancelled) {
          setStatus('connected');
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type?: string;
            data?: Message | Notification | Booking;
          };

          switch (payload.type) {
            case 'message.created': {
              const message = payload.data as Message;
              useChatStore.getState().appendMessage(message.bookingId, message);
              break;
            }
            case 'notification.created': {
              useNotificationStore.getState().pushNotification(payload.data as Notification);
              break;
            }
            case 'booking.updated': {
              useBookingStore.getState().upsertBooking(payload.data as Booking);
              break;
            }
            default:
              break;
          }
        } catch {
          // Ignore malformed events.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        setStatus('reconnecting');
        reconnectRef.current = window.setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
      }
      socketRef.current?.close();
    };
  }, [isAuthenticated, token]);

  const value = useMemo(
    () => ({
      status,
      send: (payload: Record<string, unknown>) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify(payload));
        }
      },
    }),
    [status],
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
};
