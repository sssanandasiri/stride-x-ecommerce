import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

/*
  REACT CONCEPT: controlled inputs
  In plain JS you read the input's value only when the button is clicked
  (newsletterInput.value). In React the common pattern is a "controlled
  input": the input's value is always kept in state, and every keystroke
  updates that state via onChange. This is what let us clear the field
  after submit (setEmail("")) instead of touching the DOM node directly.

  BUG FIX: your CSS class was "newslatter-form" (typo) but your JS looked
  for ".newsletter-form" — so document.querySelector() found nothing and
  the whole subscribe button silently did nothing. Fixed the typo here.
*/
export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState(false);

  const handleSubscribe = async () => {
    const trimmed = email.trim();

    if (trimmed === "") {
      setMessage({ type: "error", text: "Please enter your email address." });
      return;
    }
    if (!trimmed.includes("@")) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setSending(true);
    try {
      const result = await api.subscribeNewsletter(trimmed);
      setMessage({ type: "success", text: result.detail });
      setEmail("");
    } catch (err) {
      setMessage({ type: "error", text: err.status === 429 ? "Too many attempts. Please try again later." : err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="newsletter">
      <div>
        <span>STAY IN THE LOOP</span>
        <h2>
          Get the latest drops <br />
          straight to your inbox.
        </h2>
        {message && (
          <p style={{ color: message.type === "error" ? "#B23200" : "#19875A", fontSize: 13, marginTop: 8 }}>
            {message.text}
          </p>
        )}
        <p className="legal-note">
          By subscribing you agree to our <Link to="/privacy">privacy policy</Link>. Unsubscribe any time.
        </p>
      </div>

      <div className="newsletter-form">
        <input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
        />
        <button onClick={handleSubscribe} disabled={sending}>{sending ? "Subscribing..." : "Subscribe"}</button>
      </div>
    </section>
  );
}
