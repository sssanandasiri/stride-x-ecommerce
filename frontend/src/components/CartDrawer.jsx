import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";


export default function CartDrawer({ isOpen, onClose }) {
  const { items, removeFromCart, updateQuantity, subtotal } = useCart();

  return (
    <>
      <div
        className={`drawer-backdrop${isOpen ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      <aside className={`cart-drawer${isOpen ? " open" : ""}`} aria-hidden={!isOpen}>
        <div className="drawer-header">
          <h3>Your cart ({items.length})</h3>
          <button className="drawer-close" aria-label="Close cart" onClick={onClose}>
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="drawer-empty">
            <i className="fas fa-bag-shopping"></i>
            <p>Your cart is empty.</p>
          </div>
        ) : (
          <>
            <div className="drawer-items">
              {items.map(({ product, size, quantity }) => (
                <div className="drawer-item" key={`${product.id}::${size ?? ""}`}>
                  <img src={product.image} alt={product.name} />
                  <div className="drawer-item-info">
                    <span className="pro-brand">{product.brand}</span>
                    <p>{product.name}{size && ` · Size ${size}`}</p>
                    <div className="cart-line-qty">
                      <button aria-label="Decrease quantity" onClick={() => updateQuantity(product.id, size, quantity - 1)}>−</button>
                      <span>{quantity}</span>
                      <button aria-label="Increase quantity" onClick={() => updateQuantity(product.id, size, quantity + 1)}>+</button>
                    </div>
                  </div>
                  <button className="cart-line-remove" aria-label={`Remove ${product.name}`} onClick={() => removeFromCart(product.id, size)}>
                    <i className="fas fa-trash-can"></i>
                  </button>
                </div>
              ))}
            </div>

            <div className="drawer-footer">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>{subtotal.toFixed(2)} LKR</strong>
              </div>
              <Link to="/cart" onClick={onClose}><button className="btn-primary">View cart</button></Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
