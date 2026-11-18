import { createContext, useContext, useEffect, useState } from "react";

const WishlistContext = createContext(null);
const STORAGE_KEY = "stridex-wishlist";

function loadInitialWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }) {
  const [productIds, setProductIds] = useState(loadInitialWishlist); // array of product ids

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(productIds));
    } catch {
      // see CartContext for why this is safely ignorable
    }
  }, [productIds]);

  const isWishlisted = (productId) => productIds.includes(productId);

  const toggleWishlist = (productId) => {
    setProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const value = {
    productIds,
    isWishlisted,
    toggleWishlist,
    wishlistCount: productIds.length,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
