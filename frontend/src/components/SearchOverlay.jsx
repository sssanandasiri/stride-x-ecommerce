import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProducts } from "../context/ProductsContext";

/*
  Live search: as you type, we filter the products array in memory and
  show up to 5 matches instantly — no debounce needed since this is just
  filtering an array that's already loaded, not a network request. Once a
  real backend exists, this is the component that would switch from
  filtering `products` locally to calling something like
  GET /api/products?search=... inside a useEffect.
*/
export default function SearchOverlay({ isOpen, onClose }) {
  const { products } = useProducts();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();
  const matches = trimmed
    ? products.filter(
        (p) => p.name.toLowerCase().includes(trimmed) || p.brand.toLowerCase().includes(trimmed)
      )
    : [];

  const goToFullResults = () => {
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    onClose();
  };

  return (
    <div className="search-overlay" role="dialog" aria-modal="true">
      <div className="search-overlay-backdrop" onClick={onClose} aria-hidden="true"></div>

      <div className="search-panel">
        <div className="search-input-row">
          <i className="fas fa-magnifying-glass"></i>
          <input
            type="text"
            autoFocus
            placeholder="Search shoes, brands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && trimmed && goToFullResults()}
          />
          <button className="drawer-close" aria-label="Close search" onClick={onClose}>
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        {trimmed && (
          <div className="search-results-preview">
            {matches.length === 0 ? (
              <p className="search-no-results">No products match "{query}".</p>
            ) : (
              <>
                {matches.slice(0, 5).map((product) => (
                  <Link
                    to={`/product/${product.id}`}
                    className="search-result-row"
                    key={product.id}
                    onClick={onClose}
                  >
                    <img src={product.image} alt={product.name} />
                    <div>
                      <span className="pro-brand">{product.brand}</span>
                      <p>{product.name}</p>
                    </div>
                    <strong>{(product.salePrice ?? product.price).toFixed(2)} LKR</strong>
                  </Link>
                ))}
                {matches.length > 5 && (
                  <button className="btn-text search-view-all" onClick={goToFullResults}>
                    View all {matches.length} results
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
