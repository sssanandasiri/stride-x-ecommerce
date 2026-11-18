import { createContext, useCallback, useContext, useState } from "react";
import { api } from "../api";

/*
  Orders are now created by the backend at checkout (see CheckoutPage), so
  this context only has one job left: loading the order list for the admin
  page. `loadOrders` needs the staff token from the admin login.
*/
const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);

  const loadOrders = useCallback(async () => {
    setOrders(await api.getOrders());
  }, []);

  return <OrdersContext.Provider value={{ orders, loadOrders }}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used inside <OrdersProvider>");
  return ctx;
}
