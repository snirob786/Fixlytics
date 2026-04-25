import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import exploreReducer from "./slices/exploreSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      explore: exploreReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
