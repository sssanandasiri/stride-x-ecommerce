import { createContext, useContext, useEffect, useState } from "react";

const RecentlyViewedContext = createContext(null);
const STORAGE_KEY = "stridex-recently-viewed";
const MAX_ITEMS = 8;

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function RecentlyViewedProvider({ children }) {
  const [viewedIds, setViewedIds] = useState(loadInitial); // most recent first

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewedIds));
    } catch {
      // safe to ignore — see ProductsContext for why
    }
  }, [viewedIds]);

  const markViewed = (productId) => {
    setViewedIds((prev) => {
      const withoutCurrent = prev.filter((id) => id !== productId);
      return [productId, ...withoutCurrent].slice(0, MAX_ITEMS);
    });
  };

  return (
    <RecentlyViewedContext.Provider value={{ viewedIds, markViewed }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error("useRecentlyViewed must be used inside <RecentlyViewedProvider>");
  return ctx;
}
