import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import NewDrops from "./pages/NewDrops";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import WishlistPage from "./pages/WishlistPage";
import SearchResults from "./pages/SearchResults";
import AdminPage from "./pages/AdminPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import PolicyPage from "./pages/PolicyPage";
import AccountPage from "./pages/AccountPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import { useProducts } from "./context/ProductsContext";

/*
  Cart, wishlist, products, orders and toasts all live in Context
  (src/context/) — pages and components pull what they need directly with
  useCart()/useWishlist()/useProducts()/useOrders()/useToast(). App's only
  job is layout + routing + mounting the always-visible chat widget.

  The `path="*"` route MUST stay last — React Router matches routes in
  order, and "*" matches literally anything, so it only ever "wins" when
  nothing above it did. That's what makes it work as a 404 catch-all.
*/
export default function App() {
  const { error } = useProducts();
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />

      {error && (
        <div role="alert" style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 16px", textAlign: "center" }}>
          {error}
        </div>
      )}

      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/new-drops" element={<NewDrops />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/delivery" element={<PolicyPage doc="delivery" />} />
          <Route path="/returns" element={<PolicyPage doc="returns" />} />
          <Route path="/faq" element={<PolicyPage doc="faq" />} />
          <Route path="/privacy" element={<PolicyPage doc="privacy" />} />
          <Route path="/terms" element={<PolicyPage doc="terms" />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <ChatWidget />
    </>
  );
}
