"use client";

import { useEffect } from "react";

import { useAuth } from "@/components/auth-provider";
import { useAppDispatch } from "@/store/hooks";
import { authHydrationFinished, authHydrationStarted } from "@/store/slices/authSlice";
import { exploreReset } from "@/store/slices/exploreSlice";

/** Keeps Redux auth slice aligned with AuthProvider session (cookies + /auth/me). */
export function AuthReduxSync() {
  const { user, ready, hydrated } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!ready) return;
    if (!hydrated) {
      dispatch(authHydrationStarted());
      return;
    }
    dispatch(authHydrationFinished(user));
    if (!user) {
      dispatch(exploreReset());
    }
  }, [ready, hydrated, user, dispatch]);

  return null;
}
