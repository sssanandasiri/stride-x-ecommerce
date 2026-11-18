import { Link } from "react-router-dom";

/*
  All content on this page is plain data mapped into JSX, same pattern as
  ProductGrid — makes it trivial to add/remove a value or stat later.
*/
const stats = [
  { value: "2019", label: "Founded" },
  { value: "50+", label: "Brands carried" },
  { value: "10K+", label: "Pairs shipped" },
  { value: "4.8/5", label: "Average rating" },
];

const values = [
  {
    icon: "fa-solid fa-shoe-prints",
    title: "Curated, not crammed",
    text: "Every pair on StrideX is picked by people who actually wear sneakers — no filler, no knock-offs.",
  },
  {
    icon: "fa-solid fa-truck-fast",
    title: "Fast, tracked shipping",
    text: "Most Colombo-area orders arrive within 2–3 days, with live tracking from the moment it leaves our warehouse.",
  },
  {
    icon: "fa-solid fa-rotate-left",
    title: "30-day easy returns",
    text: "Wrong size, changed your mind, whatever the reason — send it back within 30 days for a full refund.",
  },
];

export default function About() {
  return (
    <>
      <section id="about-hero" className="section-p1">
        <div className="wrap about-hero-grid">
          <div>
            <span className="hero-tag">
              <i className="fas fa-circle"></i>
              Our story
            </span>
            <h1 className="display">Built for the way you actually move.</h1>
            <p>
              StrideX started as a small sneaker resale account run out of a
              spare room, built by people who were tired of choosing between
              a pair that looked good and a pair that actually held up.
              Today we stock over 50 brands, but the standard hasn't
              changed: if we wouldn't wear it, we don't sell it.
            </p>
          </div>
          <div className="about-stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-p1">
        <div className="wrap">
          <div className="section-title">
            <span>Why StrideX</span>
            <h2>What we actually promise</h2>
            <p>No vague "quality guaranteed" badges — here's specifically what you get.</p>
          </div>

          <div className="about-values">
            {values.map((value) => (
              <div className="about-value-card" key={value.title}>
                <i className={value.icon}></i>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="banner">
        <div className="wrap">
          <h4>Ready when you are</h4>
          <h2 className="display">Find your next pair today</h2>
          <Link to="/shop"><button>Shop all shoes</button></Link>
        </div>
      </section>
    </>
  );
}
