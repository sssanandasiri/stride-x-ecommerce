import { createContext, useContext, useEffect, useState } from "react";

/*
  REACT CONCEPT: Context
  Cart state needs to reach Header, ProductGrid, ProductDetail, CartDrawer
  and CartPage, all at different depths — Context lets any of them
  subscribe with one line (useCart()) instead of passing it down as props
  through every layer in between.

  SIZES: a cart "line" is now identified by product id + size (a size-less
  product just uses size = null), because the same shoe in two different
  sizes needs to be two separate lines, not merged into one. lineKey()
  below is the one place that logic lives — everything else just calls
  addToCart/removeFromCart/updateQuantity with (productId, size).
*/
const CartContext = createContext(null);

const STORAGE_KEY = "stridex-cart";

function lineKey(productId, size) {
  return size ? `${productId}::${size}` : productId;
}

function loadInitialCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  // items: [{ product, size, quantity }]
  const [items, setItems] = useState(loadInitialCart);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage can fail (private browsing, quota) — cart just won't
      // persist across refreshes in that case, which is an acceptable fallback.
    }
  }, [items]);

  const addToCart = (product, quantity = 1, size = null) => {
    setItems((prev) => {
      const key = lineKey(product.id, size);
      const existing = prev.find((item) => lineKey(item.product.id, item.size) === key);
      if (existing) {
        return prev.map((item) =>
          lineKey(item.product.id, item.size) === key
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, size, quantity }];
    });
    setBump(true);
    setTimeout(() => setBump(false), 200);
  };

  const removeFromCart = (productId, size = null) => {
    const key = lineKey(productId, size);
    setItems((prev) => prev.filter((item) => lineKey(item.product.id, item.size) !== key));
  };

  const updateQuantity = (productId, size, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId, size);
      return;
    }
    const key = lineKey(productId, size);
    setItems((prev) =>
      prev.map((item) =>
        lineKey(item.product.id, item.size) === key ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.salePrice ?? item.product.price) * item.quantity,
    0
  );

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    subtotal,
    bump,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
