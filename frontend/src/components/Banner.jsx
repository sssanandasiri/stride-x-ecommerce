import { Link } from "react-router-dom";
import Reveal from "./Reveal";

const promises = [
  { icon: "fa-solid fa-shoe-prints", text: "Experienced cobblers — not a drop-off counter, real repair work" },
  { icon: "fa-solid fa-clock", text: "Most repairs done within 48 hours" },
  { icon: "fa-solid fa-leaf", text: "Eco-conscious materials and cleaning products" },
  { icon: "fa-solid fa-shield-heart", text: "14-day guarantee on every repair" },
];

const installmentProviders = ["Koko", "Mintpay", "PayZ"];

export default function Banner() {
  return (
    <section id="banner">
      <div className="wrap">
        <Reveal>
          <h4>Repair services</h4>
          <h2 className="display">Transform your shoes</h2>
        </Reveal>

        <Reveal delay={100}>
          <ul className="banner-promises">
            {promises.map((p) => (
              <li key={p.text}>
                <i className={p.icon}></i>
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={200}>
          <Link to="/contact"><button>Book a repair</button></Link>
        </Reveal>

        <Reveal delay={280}>
          <div className="banner-installments">
            <span>Prefer to pay over time? We accept:</span>
            <div className="installment-badges">
              {installmentProviders.map((name) => (
                <span className="installment-badge" key={name}>{name}</span>
              ))}
            </div>
            <Link to="/shop" className="btn-text banner-installments-link">
              Start shopping
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
