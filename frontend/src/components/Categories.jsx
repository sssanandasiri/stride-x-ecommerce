import { Link } from "react-router-dom";
import categories from "../data/categories";

export default function Categories() {
  return (
    <section id="catrgories" className="section-p1" style={{ scrollMarginTop: "90px" }}>
      <div className="section-title">
        <span>Explore</span>
        <h2>Shop By Category</h2>
        <p>Find the perfect pair for every moment.</p>
      </div>

      <div className="category-container">
        {categories.map((cat) => (
          <Link to="/shop" className="category-card" key={cat.name}>
            <img src={cat.image} alt={cat.name} />
            <div className="category-overlay">
              <span>{cat.number}</span>
              <h3>{cat.name}</h3>
              <p>Shop now</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
