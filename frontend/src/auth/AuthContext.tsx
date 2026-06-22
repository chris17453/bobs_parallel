import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from '../api/client';
import type { IdentitySnapshot, User } from '../api/types';

const STORAGE_KEY = 'parallel.auth';

// Only a non-sensitive identity snapshot is cached — NEVER passwords or tokens (SPEC-auth N4).
function readCache(): IdentitySnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IdentitySnapshot;
    if (parsed && typeof parsed.id === 'string') return parsed;
  } catch {
    // ignore malformed cache
  }
  return null;
}

function writeCache(user: User | null): void {
  try {
    if (user) {
      const snap: IdentitySnapshot = {
        id: user.id,
        display_name: user.display_name,
        avatar_url: user.avatar_url ?? null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

interface AuthValue {
  /** Optimistic identity from cache or confirmed `/api/me`. */
  user: User | IdentitySnapshot | null;
  /** True once `/api/me` has confirmed the session at least once. */
  confirmed: boolean;
  isAuthenticated: boolean;
  /** Store a confirmed user (after login/signup/dev-login). */
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  /** Re-confirm against the server. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | IdentitySnapshot | null>(() => readCache());
  const [confirmed, setConfirmed] = useState(false);

  const setUser = useCallback((u: User) => {
    writeCache(u);
    setUserState(u);
    setConfirmed(true);
  }, []);

  const clear = useCallback(() => {
    writeCache(null);
    setUserState(null);
    setConfirmed(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user: confirmedUser } = await api.me();
      if (confirmedUser) {
        writeCache(confirmedUser);
        setUserState(confirmedUser);
      } else {
        writeCache(null);
        setUserState(null);
      }
    } catch (err) {
      // On 401, the cache is stale — clear it (SPEC-auth).
      if (err instanceof ApiError && err.status === 401) {
        writeCache(null);
        setUserState(null);
      }
      // Other errors (offline): keep optimistic cache.
    } finally {
      setConfirmed(true);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clear();
    }
  }, [clear]);

  // Confirm session once on mount — `/api/me` is the source of truth.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      confirmed,
      isAuthenticated: !!user,
      setUser,
      logout,
      refresh,
    }),
    [user, confirmed, setUser, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
