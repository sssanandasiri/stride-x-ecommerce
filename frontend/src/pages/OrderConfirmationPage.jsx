import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useCart } from "../context/CartContext";

const paymentLabels = {
  cod: "Cash on delivery",
  card: "Debit / Credit card",
  koko: "Koko",
  mintpay: "Mintpay",
  payz: "PayZ",
};

/*
  Two ways to arrive here:
   1. Cash on delivery: CheckoutPage navigates here and passes the order in
      `location.state`.
   2. Online payment: the payment page redirects the browser back to
      /order-confirmation?order=SX-XXXX&payment=paid|failed. A full page load
      has no state, so we fetch the order from the API using the reference.
*/
export default function OrderConfirmationPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const reference = params.get("order");
  const { clearCart } = useCart();

  const [order, setOrder] = useState(location.state?.order ?? null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (order || !reference) return;
    api.getOrder(reference).then(setOrder).catch((err) => setError(err.message));
  }, [order, reference]);

  // Empty the cart once, and only for the order that was just placed
  // (CheckoutPage leaves a note in sessionStorage). Reloading or revisiting
  // this page later therefore never wipes a newer cart.
  const cancelled = order?.status === "cancelled";
  useEffect(() => {
    if (!order || cancelled) return;
    if (sessionStorage.getItem("stridex-cart-clear") === order.id) {
      clearCart();
      sessionStorage.removeItem("stridex-cart-clear");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, cancelled]);

  if (!order && !reference) return <Navigate to="/" replace />;
  if (error) return <div className="wrap empty-state"><h1 className="display">Order not found</h1><p>{error}</p></div>;
  if (!order) return <div className="wrap empty-state"><p>Loading your order…</p></div>;

  if (cancelled) {
    return (
      <div className="wrap order-confirmation">
        <i className="fas fa-circle-xmark"></i>
        <h1 className="display">Payment not completed</h1>
        <p className="order-confirmation-id">Order #{order.id}</p>
        <p className="order-confirmation-note">
          Your payment didn't go through, so the order was cancelled and nothing was charged. Your cart is still saved.
        </p>
        <Link to="/checkout"><button className="btn-primary">Try again</button></Link>
      </div>
    );
  }

  return (
    <div className="wrap order-confirmation">
      <i className="fas fa-circle-check"></i>
      <h1 className="display">Order placed!</h1>
      <p className="order-confirmation-id">Order #{order.id}</p>
      <p className="order-confirmation-note">
        {order.paymentStatus === "paid"
          ? "Payment received — thank you! We'll get your order ready."
          : "Your order is confirmed. You'll pay when it arrives."}
      </p>

      <div className="order-confirmation-details">
        <div>
          <h4>Shipping to</h4>
          <p>{order.shipping.fullName}</p>
          <p>{order.shipping.address}, {order.shipping.city}</p>
          <p>{order.shipping.phone}</p>
        </div>
        <div>
          <h4>Payment method</h4>
          <p>{paymentLabels[order.paymentMethod] ?? order.paymentMethod}</p>
        </div>
      </div>

      <div className="order-confirmation-items">
        {order.items.map((item) => (
          <div className="checkout-summary-line" key={`${item.id}::${item.size ?? ""}`}>
            <span>{item.name}{item.size && ` (${item.size})`} × {item.quantity}</span>
            <span>{(item.price * item.quantity).toFixed(2)} LKR</span>
          </div>
        ))}
        <div className="cart-summary-row cart-summary-total">
          <span>Total</span>
          <strong>{Number(order.subtotal).toFixed(2)} LKR</strong>
        </div>
      </div>

      <Link to="/shop"><button className="btn-primary">Continue shopping</button></Link>
    </div>
  );
}
