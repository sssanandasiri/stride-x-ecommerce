import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useProducts } from "../context/ProductsContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import ProductRow from "../components/ProductRow";


export default function ProductDetail() {
  const { id } = useParams();
  const { products, loading, refreshProducts } = useProducts();
  const product = products.find((p) => p.id === id);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const { viewedIds, markViewed } = useRecentlyViewed();

  const { user } = useAuth();
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: "" });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewError, setReviewError] = useState("");

  
  const [reviewData, setReviewData] = useState({ reviews: [], canReview: false, blockedReason: null });
  const loadReviews = useCallback(async () => {
    try {
      setReviewData(await api.getReviews(id));
    } catch {
      // leave whatever we had; the rest of the page still works
    }
  }, [id]);

  // reload when the product changes or when the visitor signs in/out (their permission changes)
  useEffect(() => {
    loadReviews();
  }, [loadReviews, user?.id]);

  // RECENTLY VIEWED: record this product once per visit. The [id]
  // dependency means it re-runs whenever you navigate to a different
  // product (React remounts this component on route param changes, but
  // being explicit here is clearer than relying on that).
  useEffect(() => {
    if (id) markViewed(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!product && loading) {
    return <div className="wrap empty-state"><p>Loading…</p></div>;
  }

  if (!product) {
    return (
      <div className="wrap empty-state">
        <h1 className="display">Product not found</h1>
        <Link to="/shop"><button className="btn-primary">Back to shop</button></Link>
      </div>
    );
  }

  // GALLERY: use product.images if it's a non-empty array, otherwise just
  // show the single product.image — this is what makes the `images` field
  // in products.js optional. Most of your products don't have one yet;
  // they still work fine, just with one photo instead of a thumbnail row.
  const gallery = product.images && product.images.length > 0 ? product.images : [product.image];

  const wishlisted = isWishlisted(product.id);
  const hasSizes = Boolean(product.sizes);
  const sizeStock = hasSizes ? product.sizes.find((s) => s.size === selectedSize)?.stock ?? null : null;
  const outOfStock = hasSizes ? (product.stock ?? 0) <= 0 : (product.stock ?? 0) <= 0;
  const selectedSizeOutOfStock = hasSizes && selectedSize && sizeStock === 0;
  const availableStock = hasSizes ? sizeStock : product.stock;
  const lowStock = availableStock != null && availableStock > 0 && availableStock <= 3;

  const handleSelectSize = (size, stock) => {
    if (stock === 0) return; // can't select a sold-out size
    setSelectedSize(size);
    setSizeError(false);
    setQuantity(1);
  };

  const handleAdd = () => {
    if (hasSizes && !selectedSize) {
      setSizeError(true);
      return;
    }
    addToCart(product, quantity, selectedSize);
    showToast(`Added ${product.name}${selectedSize ? ` (size ${selectedSize})` : ""} to cart`);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const addDisabled = outOfStock || (hasSizes && selectedSize && selectedSizeOutOfStock);

  // RELATED PRODUCTS: same category, excluding the current product, up to 4.
  const relatedProducts = useMemo(
    () => products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4),
    [products, product.category, product.id]
  );

  // RECENTLY VIEWED: viewedIds is most-recent-first; map ids back to full
  // product objects (filter out the current product and anything deleted).
  const recentlyViewedProducts = useMemo(
    () =>
      viewedIds
        .filter((viewedId) => viewedId !== product.id)
        .map((viewedId) => products.find((p) => p.id === viewedId))
        .filter(Boolean)
        .slice(0, 4),
    [viewedIds, products, product.id]
  );

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError("");
    try {
      await api.postReview(product.id, { rating: Number(reviewForm.rating), text: reviewForm.text.trim() });
      setReviewForm({ rating: 5, text: "" });
      setShowReviewForm(false);
      showToast("Thanks for your review!");
      await Promise.all([loadReviews(), refreshProducts()]); // refreshProducts updates the star rating
    } catch (err) {
      setReviewError(err.message);
    }
  };

  return (
    <>
    <div className="wrap product-detail">
      <div className="product-detail-gallery">
        <div className="product-detail-media">
          {product.badge && !outOfStock && <span className="pro-badge">{product.badge}</span>}
          {outOfStock && <span className="pro-badge pro-badge-out">Out of stock</span>}
          <img src={gallery[activeImage]} alt={product.name} />
        </div>

        {gallery.length > 1 && (
          <div className="gallery-thumbs">
            {gallery.map((src, index) => (
              <button
                key={src + index}
                className={`gallery-thumb${index === activeImage ? " active" : ""}`}
                onClick={() => setActiveImage(index)}
                aria-label={`Show photo ${index + 1} of ${gallery.length}`}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-detail-info">
        <span className="pro-brand">{product.brand}</span>
        <h1 className="display">{product.name}</h1>

        <div className="pro-rating">
          {product.reviews > 0 ? (
            <>
              <span className="stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <i key={i} className={i < product.rating ? "fas fa-star" : "far fa-star"}></i>
                ))}
              </span>
              <span>({product.reviews} {product.reviews === 1 ? "review" : "reviews"})</span>
            </>
          ) : (
            <span className="pro-no-reviews">No reviews yet</span>
          )}
        </div>

        <p className="product-detail-price">
          {(product.salePrice ?? product.price).toFixed(2)} LKR
          {product.salePrice && <del>{product.price.toFixed(2)} LKR</del>}
        </p>

        <p className="product-detail-desc">
          The {product.name} pairs {product.brand}'s signature comfort with a
          silhouette built to hold up to daily wear — true to size, so order
          your usual.
        </p>

        {hasSizes && (
          <div className="size-selector">
            <span className="size-selector-label">
              Size{selectedSize ? `: ${selectedSize}` : ""}
            </span>
            <div className="size-options">
              {product.sizes.map(({ size, stock }) => (
                <button
                  key={size}
                  className={`size-option${selectedSize === size ? " selected" : ""}${stock === 0 ? " disabled" : ""}`}
                  disabled={stock === 0}
                  onClick={() => handleSelectSize(size, stock)}
                  title={stock === 0 ? "Out of stock in this size" : undefined}
                >
                  {size}
                </button>
              ))}
            </div>
            {sizeError && <p className="contact-status error">Please select a size.</p>}
          </div>
        )}

        <div className="product-detail-actions">
          <div className="qty-stepper">
            <button
              aria-label="Decrease quantity"
              disabled={addDisabled}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              aria-label="Increase quantity"
              disabled={addDisabled || (availableStock != null && quantity >= availableStock)}
              onClick={() => setQuantity((q) => (availableStock ? Math.min(availableStock, q + 1) : q + 1))}
            >
              +
            </button>
          </div>

          <button className="btn-primary" disabled={addDisabled} onClick={handleAdd}>
            {outOfStock ? "Out of stock" : justAdded ? "Added ✓" : "Add to cart"}
          </button>

          <button
            className="wishlist-btn wishlist-btn-static"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wishlisted}
            onClick={() => {
              toggleWishlist(product.id);
              showToast(wishlisted ? `Removed ${product.name} from wishlist` : `Saved ${product.name} to wishlist`);
            }}
            style={wishlisted ? { color: "var(--accent)" } : undefined}
          >
            <i className={wishlisted ? "fas fa-heart" : "far fa-heart"}></i>
          </button>
        </div>

        {outOfStock ? (
          <p className="stock-message stock-message-out">Currently out of stock — check back soon.</p>
        ) : selectedSizeOutOfStock ? (
          <p className="stock-message stock-message-out">That size is out of stock — try another.</p>
        ) : lowStock ? (
          <p className="stock-message stock-message-low">Only {availableStock} left{selectedSize ? ` in size ${selectedSize}` : ""}.</p>
        ) : null}

        <div className="product-detail-meta">
          <span><i className="fas fa-truck-fast"></i> Free shipping over 10,000 LKR</span>
          <span><i className="fas fa-rotate-left"></i> 30-day free returns</span>
        </div>
      </div>
    </div>

    {/* Everything below is OUTSIDE the two-column .product-detail grid,
        so each section spans the full page width on its own. */}

    <section className="wrap product-reviews">
      <div className="product-reviews-header">
        <h3>Customer reviews ({reviewData.reviews.length})</h3>
        {reviewData.canReview && (
          <button className="btn-text" onClick={() => setShowReviewForm((v) => !v)}>
            {showReviewForm ? "Cancel" : "Write a review"}
          </button>
        )}
      </div>

      {!reviewData.canReview && reviewData.blockedReason && (
        <p className="review-note">
          {reviewData.blockedReason === "sign_in" && (
            <><Link to="/account">Sign in</Link> to write a review. Only customers who've received this product can review it.</>
          )}
          {reviewData.blockedReason === "already_reviewed" && "Thanks, you've already reviewed this product."}
          {reviewData.blockedReason === "not_purchased" &&
            "Only customers who've received this product can review it. Orders placed while signed in count."}
        </p>
      )}

      {showReviewForm && reviewData.canReview && (
        <form className="review-form" onSubmit={handleReviewSubmit}>
          <div className="admin-form-grid">
            <label>
              Rating
              <select value={reviewForm.rating} onChange={(e) => setReviewForm((f) => ({ ...f, rating: e.target.value }))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} star{n !== 1 ? "s" : ""}</option>
                ))}
              </select>
            </label>
            <label className="checkout-full-width">
              Your review
              <textarea
                rows="3"
                maxLength={1000}
                value={reviewForm.text}
                onChange={(e) => setReviewForm((f) => ({ ...f, text: e.target.value }))}
                placeholder="What did you think? Fit, comfort, quality..."
              ></textarea>
            </label>
          </div>
          {reviewError && <p className="contact-status error">{reviewError}</p>}
          <button type="submit" className="btn-primary">Submit review</button>
        </form>
      )}

      {reviewData.reviews.length === 0 ? (
        <p className="review-note">No reviews yet.</p>
      ) : (
        <div className="review-list">
          {reviewData.reviews.map((review) => (
            <div className="review-card" key={review.id}>
              <div className="review-card-header">
                <strong>{review.author}</strong>
                <span className="stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <i key={i} className={i < review.rating ? "fas fa-star" : "far fa-star"}></i>
                  ))}
                </span>
              </div>
              <p>{review.text}</p>
              <small className="review-meta">Verified buyer · {new Date(review.date).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      )}
    </section>

    <ProductRow title="You might also like" products={relatedProducts} />
    <ProductRow title="Recently viewed" products={recentlyViewedProducts} />
    </>
  );
}
