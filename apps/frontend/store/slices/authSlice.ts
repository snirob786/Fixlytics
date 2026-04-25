import type { UserPublic } from "@fixlytics/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AuthState = {
  user: UserPublic | null;
  loading: boolean;
  hydrated: boolean;
};

const initialState: AuthState = {
  user: null,
  loading: true,
  hydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authHydrationStarted(state) {
      state.loading = true;
    },
    authHydrationFinished(state, action: PayloadAction<UserPublic | null>) {
      state.user = action.payload;
      state.hydrated = true;
      state.loading = false;
    },
  },
});

export const { authHydrationStarted, authHydrationFinished } = authSlice.actions;
export default authSlice.reducer;
