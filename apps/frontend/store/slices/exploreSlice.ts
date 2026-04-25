import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { ExploreQueryMeta, ExploreSearchResponse, ExploreSearchResultItem } from "@/lib/backend-api";

export type ExploreState = {
  queryMeta: ExploreQueryMeta | null;
  loading: boolean;
  results: ExploreSearchResultItem[];
  threshold: number;
  markedItems: Record<string, boolean>;
  removedItems: Record<string, boolean>;
};

const initialState: ExploreState = {
  queryMeta: null,
  loading: false,
  results: [],
  threshold: 50,
  markedItems: {},
  removedItems: {},
};

function initialMarksFor(items: ExploreSearchResultItem[], threshold: number): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const it of items) {
    m[it.id] = it.avgScore < threshold;
  }
  return m;
}

const exploreSlice = createSlice({
  name: "explore",
  initialState,
  reducers: {
    exploreReset() {
      return { ...initialState };
    },
    exploreSearchStarted(state) {
      state.loading = true;
    },
    exploreSearchSucceeded(state, action: PayloadAction<ExploreSearchResponse>) {
      const { queryMeta, thresholdDefault, items } = action.payload;
      state.loading = false;
      state.queryMeta = queryMeta;
      state.threshold = thresholdDefault;
      state.results = items;
      state.markedItems = initialMarksFor(items, thresholdDefault);
      state.removedItems = {};
    },
    exploreSearchFailed(state) {
      state.loading = false;
    },
    setThreshold(state, action: PayloadAction<number>) {
      const t = action.payload;
      state.threshold = t;
      state.markedItems = initialMarksFor(state.results, t);
    },
    toggleMark(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.markedItems[id] = !state.markedItems[id];
    },
    toggleRemove(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.removedItems[id] = !state.removedItems[id];
    },
  },
});

export const {
  exploreReset,
  exploreSearchStarted,
  exploreSearchSucceeded,
  exploreSearchFailed,
  setThreshold,
  toggleMark,
  toggleRemove,
} = exploreSlice.actions;
export default exploreSlice.reducer;
