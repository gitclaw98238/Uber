import { PropsWithChildren, createContext, useContext, useEffect, useMemo } from 'react';
import { AuthState, useAuthStore } from '../store/authStore';

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const authState = useAuthStore();
  const isReady = useAuthStore((state) => state.isReady);
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage);

  useEffect(() => {
    if (!isReady) {
      void hydrateFromStorage();
    }
  }, [hydrateFromStorage, isReady]);

  const value = useMemo(
    () => ({
      ...authState,
      isAuthenticated: Boolean(authState.token && authState.user),
    }),
    [authState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
