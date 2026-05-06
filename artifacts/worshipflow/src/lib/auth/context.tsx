import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PublicUser,
  clearSession,
  loginUser,
  readSession,
  rehydrateSession,
  signupUser,
  subscribeSession,
  updateUserProfile,
  userCount,
  writeSession,
} from "./store";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  hasAnyUsers: boolean;
  signup: (input: {
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  login: (input: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshUserCount: () => Promise<void>;
  updateProfile: (changes: {
    displayName?: string;
    newPassword?: string;
    currentPassword?: string;
    avatar?: string | null;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAnyUsers, setHasAnyUsers] = useState(false);
  // Monotonic version: every auth state mutation (login, logout, hydrate,
  // cross-tab sync) bumps this. Async paths must capture their version on
  // entry and check it before calling setUser, so a stale rehydrate cannot
  // overwrite a newer login/logout.
  const opVersion = useRef(0);

  const refreshUserCount = useCallback(async () => {
    try {
      const n = await userCount();
      setHasAnyUsers(n > 0);
    } catch {
      setHasAnyUsers(false);
    }
  }, []);

  // Initial hydrate — read session, confirm the user still exists locally.
  useEffect(() => {
    const myVersion = ++opVersion.current;
    let cancelled = false;
    (async () => {
      try {
        await refreshUserCount();
        const s = readSession();
        if (s) {
          const u = await rehydrateSession(s);
          if (cancelled || myVersion !== opVersion.current) return;
          if (u) setUser(u);
          else clearSession();
        }
      } finally {
        if (!cancelled && myVersion === opVersion.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUserCount]);

  // Cross-tab session sync.
  useEffect(() => {
    return subscribeSession(async () => {
      const myVersion = ++opVersion.current;
      const s = readSession();
      if (!s) {
        setUser(null);
        return;
      }
      const u = await rehydrateSession(s);
      if (myVersion !== opVersion.current) return; // a newer op superseded us
      setUser(u ?? null);
    });
  }, []);

  const signup = useCallback<AuthContextValue["signup"]>(
    async ({ username, password, displayName }) => {
      const u = await signupUser({ username, password, displayName });
      ++opVersion.current;
      writeSession({ userId: u.id, username: u.username, displayName: u.displayName });
      setUser(u);
      setHasAnyUsers(true);
    },
    [],
  );

  const login = useCallback<AuthContextValue["login"]>(
    async ({ username, password }) => {
      const u = await loginUser({ username, password });
      ++opVersion.current;
      writeSession({ userId: u.id, username: u.username, displayName: u.displayName });
      setUser(u);
    },
    [],
  );

  const logout = useCallback(() => {
    ++opVersion.current;
    clearSession();
    setUser(null);
  }, []);

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>(
    async (changes) => {
      const s = readSession();
      if (!s) throw new Error("Not signed in.");
      const u = await updateUserProfile(s.userId, changes);
      ++opVersion.current;
      writeSession({ userId: u.id, username: u.username, displayName: u.displayName });
      setUser(u);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, hasAnyUsers, signup, login, logout, refreshUserCount, updateProfile }),
    [user, loading, hasAnyUsers, signup, login, logout, refreshUserCount, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
