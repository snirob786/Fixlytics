"use client";

import type { AuthSessionResponse, UserPublic } from "@fixlytics/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchJson } from "@/lib/api-client";

type AuthContextValue = {
  user: UserPublic | null;
  /** Client mounted (browser). */
  ready: boolean;
  /** Finished initial `GET /auth/me` (or login shortcut). */
  hydrated: boolean;
  login: (session: AuthSessionResponse) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const authRequestGen = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const gen = ++authRequestGen.current;
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchJson<UserPublic>("/auth/me");
        if (!cancelled && gen === authRequestGen.current) setUser(me);
      } catch {
        if (!cancelled && gen === authRequestGen.current) setUser(null);
      } finally {
        if (!cancelled && gen === authRequestGen.current) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const login = useCallback((session: AuthSessionResponse) => {
    authRequestGen.current += 1;
    setUser(session.user);
    setHydrated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetchJson<{ ok: boolean }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      // still clear local session
    }
    authRequestGen.current += 1;
    setUser(null);
    setHydrated(true);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      hydrated,
      login,
      logout,
    }),
    [user, ready, hydrated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
