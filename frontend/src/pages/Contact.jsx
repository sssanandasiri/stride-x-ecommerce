import { useState } from "react";
import { api } from "../api";
import { shop } from "../config/shop";

// `hp_check` is a hidden "honeypot" field: real people never see it, spam bots fill it in.
const initialForm = { name: "", email: "", subject: "", message: "", hp_check: "" };

const storeInfo = [
  { icon: "fa-solid fa-location-dot", label: "Visit us", value: shop.address },
  { icon: "fa-solid fa-phone", label: "Call us", value: shop.phone },
  { icon: "fa-solid fa-envelope", label: "Email us", value: shop.email },
  { icon: "fa-solid fa-clock", label: "Store hours", value: shop.hours },
];

/*
  REACT CONCEPT: one state object for a whole form
  Rather than a separate useState for name/email/subject/message, this
  keeps all four fields in one object and updates just the one key that
  changed, using the input's own "name" attribute. This is the standard
  pattern once a form has more than 2-3 fields — see handleChange below.
*/
export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // stop the browser's default full-page form submit

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus({ type: "error", text: "Please fill in your name, email and message." });
      return;
    }
    if (!form.email.includes("@")) {
      setStatus({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setSending(true);
    setStatus(null);
    try {
      await api.sendContact(form);
      setStatus({ type: "success", text: "Thanks! We've got your message and will reply by email." });
      setForm(initialForm);
    } catch (err) {
      setStatus({ type: "error", text: err.status === 429 ? "You've sent a few messages already. Please try again later." : err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact-page" className="section-p1">
      <div className="wrap">
        <div className="section-title">
          <span>Get in touch</span>
          <h2>We're happy to help</h2>
          <p>Questions about an order, a return, or just want to say hi — reach out below.</p>
        </div>

        <div className="contact-grid">
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="contact-form-row">
              <label>
                Name
                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" />
              </label>
              <label>
                Email
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
              </label>
            </div>
            <label>
              Subject
              <input type="text" name="subject" value={form.subject} onChange={handleChange} placeholder="What's this about?" />
            </label>
            <label>
              Message
              <textarea name="message" rows="5" value={form.message} onChange={handleChange} placeholder="Tell us what's up..."></textarea>
            </label>

            {/* honeypot: hidden from people and from screen readers */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
              <label>
                Leave this empty
                <input type="text" name="hp_check" tabIndex={-1} autoComplete="off" value={form.hp_check} onChange={handleChange} />
              </label>
            </div>

            {status && (
              <p className={`contact-status ${status.type}`}>{status.text}</p>
            )}

            <button type="submit" className="btn-primary" disabled={sending}>{sending ? "Sending..." : "Send message"}</button>
          </form>

          <div className="contact-info">
            {storeInfo.map((item) => (
              <div className="contact-info-card" key={item.label}>
                <i className={item.icon}></i>
                <div>
                  <span>{item.label}</span>
                  <p>{item.value}</p>
                </div>
              </div>
            ))}
            <div className="social-icons contact-socials">
              <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
              <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
              <a href="#" aria-label="TikTok"><i className="fab fa-tiktok"></i></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
