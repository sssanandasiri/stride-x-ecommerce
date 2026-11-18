import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";

// The link in the password-reset email opens this page: /reset-password?uid=...&token=...
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const uid = params.get("uid");
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.confirmPasswordReset(uid, token, password);
      setDone(true);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (!uid || !token) {
    return (
      <div className="wrap empty-state">
        <h1 className="display">Link not valid</h1>
        <p>Open the link from your reset email, or ask for a new one.</p>
        <Link to="/account"><button className="btn-primary">Go to sign in</button></Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="wrap empty-state">
        <h1 className="display">Password updated</h1>
        <p>You can sign in with your new password now.</p>
        <Link to="/account"><button className="btn-primary">Sign in</button></Link>
      </div>
    );
  }

  return (
    <section className="section-p1">
      <div className="wrap account-page account-auth">
        <h1 className="display">Choose a new password</h1>
        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <label>
            New password (at least 8 characters)
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </label>
          {message && <p className={`contact-status ${message.type}`}>{message.text}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving..." : "Save new password"}</button>
        </form>
      </div>
    </section>
  );
}
