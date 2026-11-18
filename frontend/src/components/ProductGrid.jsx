import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";
import Reveal from "./Reveal";

const PAGE_SIZE = 8;

/*
  REACT CONCEPT: pagination with useMemo + useState
  `page` is state because clicking "Next"/a page number needs to trigger a
  re-render. useMemo recomputes the sorted/paged slice only when its
  dependencies (products, sortBy, page) actually change, instead of on
  every render — a small perf habit, not required for a list this size,
  but the right default once lists get longer.

  The `products` prop is now optional — if a page doesn't pass one,
  ProductGrid falls back to the full live catalog from useProducts().
  Passing a prop (like Shop's category-filtered list, or a wishlist) still
  works exactly the same as before.

  NEW: `limit` and `hideSort` turn this into a compact "preview" mode —
  used by Home's New Arrivals section, which wants exactly 8 items with
  no sort dropdown or pagination controls cluttering a homepage teaser.
  Pass `viewAllLink` to show a "View all" link under a limited grid.
*/
export default function ProductGrid({
  products,
  title = "Featured pairs",
  subtitle = "This week's most-wanted releases.",
  limit,
  hideSort = false,
  viewAllLink,
}) {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("popular");
  const [page, setPage] = useState(1);

  const sourceProducts = products;

  const sortedProducts = useMemo(() => {
    const list = [...sourceProducts];
    switch (sortBy) {
      case "price-asc":
        return list.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
      case "price-desc":
        return list.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
      case "newest":
        return list.sort((a, b) => (b.badge === "New") - (a.badge === "New"));
      default:
        return list.sort((a, b) => b.reviews - a.reviews); // "Popular" = most reviewed
    }
  }, [sourceProducts, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));

  // If the underlying product list shrinks (e.g. an admin deletes items,
  // or you switch category filters) and the current page no longer
  // exists, snap back to page 1 instead of showing a blank grid.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  // limit mode (e.g. homepage preview): slice straight to `limit` items,
  // no pagination at all. Normal mode: paginate PAGE_SIZE at a time.
  const pageProducts = limit
    ? sortedProducts.slice(0, limit)
    : sortedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeSort = (value) => {
    setSortBy(value);
    setPage(1);
  };

  const handleQuickAdd = (product) => {
    if (product.sizes) {
      // Can't add a sized product without picking a size — send them
      // to the page where that's possible instead of guessing for them.
      navigate(`/product/${product.id}`);
      return;
    }
    addToCart(product, 1);
    showToast(`Added ${product.name} to cart`);
  };

  const handleWishlistToggle = (product, wishlisted) => {
    toggleWishlist(product.id);
    showToast(wishlisted ? `Removed ${product.name} from wishlist` : `Saved ${product.name} to wishlist`);
  };

  return (
    <section id="product1">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          {!hideSort && (
            <div className="sort-bar">
              <select aria-label="Sort products" value={sortBy} onChange={(e) => changeSort(e.target.value)}>
                <option value="popular">Sort: Popular</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          )}
        </div>

        {sortedProducts.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No products to show yet.</p>
        ) : (
          <>
            <div className="pro-container">
              {pageProducts.map((product, index) => {
                const wishlisted = isWishlisted(product.id);
                const outOfStock = (product.stock ?? 0) <= 0;
                const lowStock = !outOfStock && product.stock <= 3;
                return (
                  <Reveal as="article" className="pro" key={product.id} delay={(index % 4) * 70}>
                    <div className="pro-media">
                      {outOfStock ? (
                        <span className="pro-badge pro-badge-out">Out of stock</span>
                      ) : (
                        product.badge && <span className="pro-badge">{product.badge}</span>
                      )}
                      <button
                        className="wishlist-btn"
                        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        aria-pressed={wishlisted}
                        onClick={() => handleWishlistToggle(product, wishlisted)}
                        style={wishlisted ? { color: "var(--accent)" } : undefined}
                      >
                        <i className={wishlisted ? "fas fa-heart" : "far fa-heart"}></i>
                      </button>
                      <Link to={`/product/${product.id}`}>
                        <img src={product.image} alt={`${product.brand} ${product.name}`} />
                      </Link>
                      <button
                        className="quick-add"
                        disabled={outOfStock}
                        onClick={() => handleQuickAdd(product)}
                      >
                        <i className="fas fa-bag-shopping"></i>{" "}
                        {outOfStock ? "Out of stock" : product.sizes ? "Select size" : "Quick add"}
                      </button>
                    </div>
                    <div className="pro-body">
                      <span className="pro-brand">{product.brand}</span>
                      <h3 className="pro-name">
                        <Link to={`/product/${product.id}`}>{product.name}</Link>
                      </h3>
                      <div className="pro-rating">
                        {product.reviews > 0 ? (
                          <>
                            <span className="stars">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <i key={i} className={i < product.rating ? "fas fa-star" : "far fa-star"}></i>
                              ))}
                            </span>
                            <span>({product.reviews})</span>
                          </>
                        ) : (
                          <span className="pro-no-reviews">No reviews yet</span>
                        )}
                      </div>
                      <div className="pro-footer">
                        <div className="pro-price">
                          <strong>{(product.salePrice ?? product.price).toFixed(2)} LKR</strong>
                          {product.salePrice && <del>{product.price.toFixed(2)}</del>}
                        </div>
                        {lowStock && <span className="pro-lowstock">Only {product.stock} left</span>}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            {limit && viewAllLink && sortedProducts.length > limit && (
              <div className="view-all-row">
                <Link to={viewAllLink} className="btn-text">
                  View all {sortedProducts.length} <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            )}

            {!limit && totalPages > 1 && (
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <i className="fas fa-chevron-left"></i> Prev
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={page === i + 1 ? "active" : ""}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
