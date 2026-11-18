import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, subtotal } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="wrap empty-state">
        <i className="fas fa-bag-shopping"></i>
        <h1 className="display">Your cart is empty</h1>
        <p>Find something you like and add it to your cart.</p>
        <Link to="/shop"><button className="btn-primary">Browse shoes</button></Link>
      </div>
    );
  }

  return (
    <div className="wrap cart-page">
      <h1 className="display">Your cart</h1>
      <p className="cart-page-count">{items.length} {items.length === 1 ? "item" : "items"}</p>

      <div className="cart-page-grid">
        <div className="cart-line-items">
          {items.map(({ product, size, quantity }) => (
            <div className="cart-line-item" key={`${product.id}::${size ?? ""}`}>
              <Link to={`/product/${product.id}`} className="cart-line-image">
                <img src={product.image} alt={product.name} />
              </Link>
              <div className="cart-line-info">
                <span className="pro-brand">{product.brand}</span>
                <Link to={`/product/${product.id}`}><h3>{product.name}</h3></Link>
                {size && <p className="cart-line-size">Size {size}</p>}
                <p className="cart-line-price">{(product.salePrice ?? product.price).toFixed(2)} LKR</p>
              </div>

              <div className="cart-line-qty">
                <button aria-label="Decrease quantity" onClick={() => updateQuantity(product.id, size, quantity - 1)}>−</button>
                <span>{quantity}</span>
                <button aria-label="Increase quantity" onClick={() => updateQuantity(product.id, size, quantity + 1)}>+</button>
              </div>

              <div className="cart-line-total">
                {((product.salePrice ?? product.price) * quantity).toFixed(2)} LKR
              </div>

              <button className="cart-line-remove" aria-label={`Remove ${product.name}`} onClick={() => removeFromCart(product.id, size)}>
                <i className="fas fa-trash-can"></i>
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h3>Order summary</h3>
          <div className="cart-summary-row">
            <span>Subtotal</span>
            <strong>{subtotal.toFixed(2)} LKR</strong>
          </div>
          <div className="cart-summary-row">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="cart-summary-row cart-summary-total">
            <span>Estimated total</span>
            <strong>{subtotal.toFixed(2)} LKR</strong>
          </div>
          <button className="btn-primary cart-checkout-btn" onClick={() => navigate("/checkout")}>
            Checkout
          </button>
          <Link to="/shop" className="btn-text">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
