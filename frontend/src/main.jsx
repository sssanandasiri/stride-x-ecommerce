import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import { ProductsProvider } from "./context/ProductsContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { OrdersProvider } from "./context/OrdersContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { RecentlyViewedProvider } from "./context/RecentlyViewedContext.jsx";
import "./index.css";

// This is the one place plain JS touches the real DOM: it finds <div id="root">
// (from index.html) and hands control of everything inside it to React.
// Every Provider wraps the whole app so any component, anywhere, can call
// its matching hook (useCart, useWishlist, useProducts, useToast, useOrders)
// without prop-drilling. Order matters a little here: ToastProvider wraps
// everything else so any of the other providers' consumers can show a toast.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ProductsProvider>
            <OrdersProvider>
              <CartProvider>
                <WishlistProvider>
                  <RecentlyViewedProvider>
                    <App />
                  </RecentlyViewedProvider>
                </WishlistProvider>
              </CartProvider>
            </OrdersProvider>
          </ProductsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
