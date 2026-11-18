import { Link } from "react-router-dom";
import { shop } from "../config/shop";

export default function Footer() {
  return (
    <footer>
      <div className="footer-container">
        <div className="footer-brand">
          <p className="logo-word display" style={{ color: "#fff" }}>
            Stride<span className="dot">.X</span>
          </p>
          <p>Step into your style with StrideX. Premium footwear for every journey.</p>
          <div className="social-icons">
            <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
            <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
            <a href="#" aria-label="TikTok"><i className="fab fa-tiktok"></i></a>
          </div>
        </div>

        <div className="footer-column">
          <h4>Shop</h4>
          <Link to="/shop">All Shoes</Link>
          <Link to="/new-drops">New Arrivals</Link>
          <Link to="/shop">Best Sellers</Link>
          <Link to="/shop">Sale</Link>
          <Link to="/account">My account</Link>
        </div>

        <div className="footer-column">
          <h4>Help</h4>
          <Link to="/delivery">Delivery</Link>
          <Link to="/returns">Returns &amp; refunds</Link>
          <Link to="/faq">FAQs</Link>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div className="footer-column">
          <h4>Company</h4>
          <Link to="/about">About Us</Link>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms &amp; conditions</Link>
          <Link to="/admin" className="footer-admin-link">Store admin</Link>
        </div>
      </div>

      <div className="copyright">© 2026 {shop.name}. All Rights Reserved.</div>
    </footer>
  );
}
