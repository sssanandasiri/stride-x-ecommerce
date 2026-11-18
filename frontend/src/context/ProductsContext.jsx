import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api";

/*
  Same hook as before (useProducts) and the same functions, so every page
  keeps working unchanged — but the data now comes from the Django API
  (MySQL) instead of localStorage. That's the payoff of keeping all data
  access behind one Context.

  New: `loading` and `error`, because network calls take time and can fail.
  The write functions are async and THROW on failure (e.g. not logged in,
  duplicate id) — callers catch and show the message.
*/
const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshProducts = useCallback(async () => {
    try {
      setProducts(await api.getProducts());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
    // Also reload when the person returns to this browser tab, so stock isn't stale.
    const onVisible = () => document.visibilityState === "visible" && refreshProducts();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshProducts]);

  const addProduct = async (product) => {
    const created = await api.createProduct(product);
    setProducts((prev) => [...prev, created]);
    return created;
  };

  const updateProduct = async (id, changes) => {
    const updated = await api.updateProduct(id, changes);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const deleteProduct = async (id) => {
    await api.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const resetToDefaults = async () => {
    await api.resetCatalog();
    await refreshProducts();
  };

  const value = { products, loading, error, refreshProducts, addProduct, updateProduct, deleteProduct, resetToDefaults };
  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used inside <ProductsProvider>");
  return ctx;
}
