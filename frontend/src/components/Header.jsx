import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import CartDrawer from "./CartDrawer";
import SearchOverlay from "./SearchOverlay";

/*
  REACT CONCEPT: mixing local state and Context in one component
  menuOpen/cartOpen/searchOpen are local state — nobody outside Header
  cares whether the drawer is currently sliding open, so there's no need
  to lift it up or put it in Context. cartCount/wishlistCount, on the
  other hand, come from useCart()/useWishlist() because that data is
  shared with other pages (ProductGrid, CartPage, WishlistPage...).
  A good rule of thumb: state stays as local as possible, and only moves
  up to Context/parents once more than one place genuinely needs it.

  NAV FIX (carried over from before): nav items use NavLink so they
  actually route, with the current page auto-highlighted via `.active`.
*/
const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/shop", label: "Shop" },
  { to: "/new-drops", label: "New Drops" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { cartCount, bump } = useCart();
  const { wishlistCount } = useWishlist();
  const { user } = useAuth();

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <section id="header">
        <div className="wrap">
          <Link to="/" className="logo-word display" onClick={closeMenu}>
            Stride<span className="dot">.X</span>
          </Link>

          <ul id="navbar" className={menuOpen ? "active" : ""}>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={closeMenu}
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="nav-actions">
            <button className="icon-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <i className="fas fa-magnifying-glass"></i>
            </button>

            <Link to="/account" className="icon-btn" aria-label={user ? `Your account (${user.name})` : "Sign in or create an account"}>
              <i className={user ? "fas fa-user" : "far fa-user"}></i>
            </Link>

            <Link to="/wishlist" className="icon-btn" aria-label={`Wishlist, ${wishlistCount} items`}>
              <i className={wishlistCount > 0 ? "fas fa-heart" : "far fa-heart"}></i>
              {wishlistCount > 0 && <span className="cart-count">{wishlistCount}</span>}
            </Link>

            <button
              className="icon-btn cart-btn"
              aria-label={`Cart, ${cartCount} items`}
              onClick={() => setCartOpen(true)}
            >
              <i className="fas fa-bag-shopping"></i>
              <span
                className="cart-count"
                style={{ transform: bump ? "scale(1.5)" : "scale(1)", transition: "transform 0.2s" }}
              >
                {cartCount}
              </span>
            </button>

            <button
              className="nav-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <i className={menuOpen ? "fas fa-xmark" : "fas fa-bars"}></i>
            </button>
          </div>
        </div>
      </section>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
