import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const initialShipping = { fullName: "", phone: "", email: "", address: "", city: "" };

/*
  PAYMENT METHODS — this list is UI-only right now. Selecting "Koko",
  "Mintpay", or "PayZ" doesn't talk to those providers; there's no backend
  yet to hold the merchant credentials each one requires. This is exactly
  the form/UX a real integration will slot into later: on submit, instead
  of just logging the order locally, you'd call your Django backend,
  which calls the chosen provider's API with your merchant secret (never
  exposed to the browser) and gets back either a redirect URL (for
  card/installment checkout hosted by them) or a confirmation.
*/
const paymentMethods = [
  { id: "cod", label: "Cash on delivery", icon: "fa-solid fa-money-bill-wave", note: "Pay when your order arrives." },
  { id: "card", label: "Debit / Credit card", icon: "fa-solid fa-credit-card", note: "Visa, Mastercard." },
  { id: "koko", label: "Koko", icon: "fa-solid fa-calendar-check", note: "Pay in installments." },
  { id: "mintpay", label: "Mintpay", icon: "fa-solid fa-calendar-check", note: "Pay in installments." },
  { id: "payz", label: "PayZ", icon: "fa-solid fa-calendar-check", note: "Pay in installments." },
];

export default function CheckoutPage() {
  const { items, subtotal } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [shipping, setShipping] = useState(initialShipping);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  // Which payment methods the server says really work (null = still loading).
  const [availableMethods, setAvailableMethods] = useState(null);

  // Signed-in shoppers get their details filled in (from their last order). We only fill
  // fields they haven't typed into yet.
  useEffect(() => {
    if (!user) return;
    setShipping((current) => {
      const last = user.lastShipping;
      return {
        fullName: current.fullName || last?.fullName || user.name,
        phone: current.phone || last?.phone || "",
        email: current.email || last?.email || user.email,
        address: current.address || last?.address || "",
        city: current.city || last?.city || "",
      };
    });
  }, [user]);

  useEffect(() => {
    api.getPaymentMethods()
      .then(({ methods }) => {
        setAvailableMethods(methods);
        setPaymentMethod((current) => (methods.includes(current) ? current : methods[0] ?? "cod"));
      })
      .catch(() => setAvailableMethods(null)); // if it fails, show everything; the server still validates
  }, []);

  if (items.length === 0) {
    return (
      <div className="wrap empty-state">
        <i className="fas fa-bag-shopping"></i>
        <h1 className="display">Nothing to check out</h1>
        <p>Your cart is empty right now.</p>
        <Link to="/shop"><button className="btn-primary">Browse shoes</button></Link>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setShipping((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!shipping.fullName.trim() || !shipping.phone.trim() || !shipping.address.trim() || !shipping.city.trim()) {
      setError("Please fill in your name, phone, address and city.");
      return;
    }
    if (shipping.email && !shipping.email.includes("@")) {
      setError("Please enter a valid email, or leave it blank.");
      return;
    }
    setError("");
    setPlacing(true);

    // We send ONLY ids, sizes and quantities. The server looks up the real
    // prices and checks stock itself — never trust prices from the browser.
    try {
      const order = await api.createOrder({
        shipping,
        paymentMethod,
        items: items.map(({ product, size, quantity }) => ({ id: product.id, size, quantity })),
      });

      // Remember this order so the confirmation page may empty the cart once
      // (and only once — revisiting the page later must not wipe a new cart).
      sessionStorage.setItem("stridex-cart-clear", order.id);

      if (order.paymentUrl) {
        // Card / Koko / Mintpay / PayZ: go to the payment page. The provider
        // sends the customer back to /order-confirmation when done.
        window.location.href = order.paymentUrl;
      } else {
        // Cash on delivery: nothing to pay online, the order is confirmed.
        navigate("/order-confirmation", { state: { order } });
      }
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  };

  return (
    <div className="wrap checkout-page">
      <h1 className="display">Checkout</h1>

      <form className="checkout-grid" onSubmit={handlePlaceOrder}>
        <div className="checkout-main">
          <section className="checkout-section">
            <h3>Shipping details</h3>
            <div className="admin-form-grid checkout-form-grid">
              <label>
                Full name
                <input name="fullName" value={shipping.fullName} onChange={handleChange} placeholder="Your name" />
              </label>
              <label>
                Phone
                <input name="phone" value={shipping.phone} onChange={handleChange} placeholder="07X XXX XXXX" />
              </label>
              <label>
                Email (optional — we'll send your receipt and order updates)
                <input name="email" type="email" value={shipping.email} onChange={handleChange} placeholder="you@example.com" />
              </label>
              <label>
                City
                <input name="city" value={shipping.city} onChange={handleChange} placeholder="Colombo" />
              </label>
              <label className="checkout-full-width">
                Delivery address
                <input name="address" value={shipping.address} onChange={handleChange} placeholder="Street, house/apartment number" />
              </label>
            </div>
          </section>

          <section className="checkout-section">
            <h3>Payment method</h3>
            <div className="payment-methods">
              {paymentMethods
                .filter((m) => !availableMethods || availableMethods.includes(m.id))
                .map((method) => (
                <label
                  key={method.id}
                  className={`payment-method${paymentMethod === method.id ? " selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                  />
                  <i className={method.icon}></i>
                  <div>
                    <strong>{method.label}</strong>
                    <span>{method.note}</span>
                  </div>
                </label>
              ))}
            </div>
            <p className="payment-disclaimer">
              <i className="fas fa-circle-info"></i>
              Sandbox mode: online payment methods open a test page — no real money moves until a live provider is connected.
            </p>
          </section>

          {error && <p className="contact-status error">{error}</p>}
        </div>

        <aside className="cart-summary checkout-summary">
          <h3>Order summary</h3>
          {items.map(({ product, size, quantity }) => (
            <div className="checkout-summary-line" key={`${product.id}::${size ?? ""}`}>
              <span>{product.name}{size && ` (${size})`} × {quantity}</span>
              <span>{((product.salePrice ?? product.price) * quantity).toFixed(2)} LKR</span>
            </div>
          ))}
          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>
            <strong>{subtotal.toFixed(2)} LKR</strong>
          </div>
          <button type="submit" className="btn-primary cart-checkout-btn" disabled={placing}>
            {placing ? "Placing order..." : "Place order"}
          </button>
          {!user && (
            <p className="legal-note">
              <Link to="/account">Sign in</Link> first if you want to see this order in your account and review the products later.
            </p>
          )}
          <p className="legal-note">
            By placing your order you agree to our <Link to="/terms">terms</Link>,{" "}
            <Link to="/returns">returns policy</Link> and <Link to="/privacy">privacy policy</Link>.
          </p>
        </aside>
      </form>
    </div>
  );
}
