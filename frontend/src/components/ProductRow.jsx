import { Link } from "react-router-dom";

// A compact, horizontally-scrolling row of product cards — used for both
// "You might also like" and "Recently viewed" on ProductDetail. Lighter
// than ProductGrid (no sort/pagination), since a row just needs to show
// a handful of items side by side.
export default function ProductRow({ title, products }) {
  if (!products || products.length === 0) return null;

  return (
    <section className="product-row">
      <div className="wrap">
        <h3 className="product-row-title">{title}</h3>
        <div className="product-row-track">
          {products.map((product) => (
            <Link to={`/product/${product.id}`} className="product-row-card" key={product.id}>
              <img src={product.image} alt={product.name} />
              <span className="pro-brand">{product.brand}</span>
              <p>{product.name}</p>
              <strong>{(product.salePrice ?? product.price).toFixed(2)} LKR</strong>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
