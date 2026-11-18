import { Link } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { useProducts } from "../context/ProductsContext";
import { useWishlist } from "../context/WishlistContext";

export default function WishlistPage() {
  const { products } = useProducts();
  const { productIds } = useWishlist();
  const savedProducts = products.filter((p) => productIds.includes(p.id));

  if (savedProducts.length === 0) {
    return (
      <div className="wrap empty-state">
        <i className="far fa-heart"></i>
        <h1 className="display">Your wishlist is empty</h1>
        <p>Tap the heart on any product to save it here for later.</p>
        <Link to="/shop"><button className="btn-primary">Browse shoes</button></Link>
      </div>
    );
  }

  return (
    <ProductGrid
      products={savedProducts}
      title="Your wishlist"
      subtitle={`${savedProducts.length} saved ${savedProducts.length === 1 ? "pair" : "pairs"}.`}
    />
  );
}
