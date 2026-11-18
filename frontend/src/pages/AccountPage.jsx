import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const statusLabels = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  shipped: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const blankForm = { name: "", email: "", password: "" };

export default function AccountPage() {
  const { user, loading, login, register, logout } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState(null); // { type: "error" | "success", text }
  const [busy, setBusy] = useState(false);

  const [orders, setOrders] = useState(null);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load this customer's order history whenever they sign in.
  useEffect(() => {
    if (!user) {
      setOrders(null);
      return;
    }
    api.getMyOrders().then(setOrders).catch((err) => setOrdersError(err.message));
  }, [user]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const switchMode = (next) => {
    setMode(next);
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else if (mode === "register") {
        await register(form.name, form.email, form.password);
      } else {
        const result = await api.requestPasswordReset(form.email);
        setMessage({ type: "success", text: result.detail });
      }
      if (mode !== "forgot") setForm(blankForm);
    } catch (err) {
      setMessage({ type: "error", text: err.status === 429 ? "Too many attempts. Please wait a while and try again." : err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="wrap empty-state"><p>Loading…</p></div>;
  }

  // ---------- signed in ----------
  if (user) {
    return (
      <section className="section-p1">
        <div className="wrap account-page">
          <div className="account-header">
            <div>
              <h1 className="display">Hi, {user.name}</h1>
              <p className="account-email">{user.email}</p>
            </div>
            <button className="btn-text" onClick={logout}>Sign out</button>
          </div>

          <h2>Your orders</h2>
          {ordersError && <p className="contact-status error">{ordersError}</p>}
          {orders === null && !ordersError && <p>Loading your orders…</p>}
          {orders && orders.length === 0 && (
            <p className="account-empty">
              No orders yet. <Link to="/shop">Browse the shop</Link>. Orders you place while signed in will show up here.
            </p>
          )}

          <div className="account-orders">
            {orders?.map((order) => (
              <article className="account-order" key={order.id}>
                <div className="account-order-top">
                  <strong>{order.id}</strong>
                  <span className={`account-status account-status-${order.status}`}>
                    {statusLabels[order.status] ?? order.status}
                  </span>
                </div>
                <p className="account-order-date">{new Date(order.date).toLocaleDateString()}</p>
                <ul>
                  {order.items.map((item) => (
                    <li key={`${item.id}::${item.size ?? ""}`}>
                      {item.name}
                      {item.size && ` (size ${item.size})`} × {item.quantity}
                    </li>
                  ))}
                </ul>
                <div className="account-order-bottom">
                  <strong>{Number(order.subtotal).toFixed(2)} LKR</strong>
                  <Link to={`/order-confirmation?order=${order.id}`}>View details</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ---------- signed out ----------
  const titles = { login: "Sign in", register: "Create your account", forgot: "Reset your password" };
  return (
    <section className="section-p1">
      <div className="wrap account-page account-auth">
        <h1 className="display">{titles[mode]}</h1>
        <p className="account-lead">
          {mode === "forgot"
            ? "Enter your email and we'll send you a link to choose a new password."
            : "An account lets you see your orders and review products you've bought."}
        </p>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          {mode === "register" && (
            <label>
              Name
              <input name="name" value={form.name} onChange={handleChange} autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={handleChange} autoComplete="email" />
          </label>
          {mode !== "forgot" && (
            <label>
              Password{mode === "register" && " (at least 8 characters)"}
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>
          )}

          {message && <p className={`contact-status ${message.type}`}>{message.text}</p>}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}
          </button>
        </form>

        <p className="account-switch">
          {mode === "login" && (
            <>
              <button className="btn-text" onClick={() => switchMode("register")}>Create an account</button>
              <button className="btn-text" onClick={() => switchMode("forgot")}>Forgot your password?</button>
            </>
          )}
          {mode !== "login" && <button className="btn-text" onClick={() => switchMode("login")}>Back to sign in</button>}
        </p>
      </div>
    </section>
  );
}
