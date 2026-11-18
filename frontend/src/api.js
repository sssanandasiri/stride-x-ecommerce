const BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "stridex-admin-token";

const CUSTOMER_TOKEN_KEY = "stridex-customer-token";

// Shop-admin (staff) token: lives only while the browser tab is open.
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

// Customer token: kept in localStorage so shoppers stay signed in between visits.
export const getCustomerToken = () => localStorage.getItem(CUSTOMER_TOKEN_KEY);
export const setCustomerToken = (token) => localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
export const clearCustomerToken = () => localStorage.removeItem(CUSTOMER_TOKEN_KEY);

// Django REST Framework returns errors as {detail: "..."} or {field: ["..."]}.
function errorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const first = Object.entries(data)[0];
  if (!first) return fallback;
  const [field, msg] = first;
  const text = Array.isArray(msg) ? msg[0] : typeof msg === "object" ? JSON.stringify(msg) : msg;
  return `${field}: ${text}`;
}

// auth: false = anonymous, true = shop-admin token, "customer" = signed-in shopper's token
async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  const isForm = body instanceof FormData; // file uploads: the browser sets the Content-Type itself
  if (!isForm) headers["Content-Type"] = "application/json";
  const token = auth === "customer" ? getCustomerToken() : auth ? getToken() : null;
  if (token) headers.Authorization = `Token ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw Object.assign(new Error("Can't reach the server. Is the Django backend running?"), { status: 0 });
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error(errorMessage(data, `Request failed (${res.status})`)), { status: res.status });
  }
  return data;
}

// Some calls work for guests AND signed-in shoppers. If we send an old/expired token the
// server answers 401, so in that case forget the token and simply retry as a guest.
async function withOptionalCustomerAuth(path, options = {}) {
  if (!getCustomerToken()) return request(path, options);
  try {
    return await request(path, { ...options, auth: "customer" });
  } catch (err) {
    if (err.status !== 401) throw err;
    clearCustomerToken();
    return request(path, options);
  }
}

export const api = {
  // products
  getProducts: () => request("/api/products/"),
  createProduct: (p) => request("/api/products/", { method: "POST", body: p, auth: true }),
  updateProduct: (id, changes) => request(`/api/products/${id}/`, { method: "PATCH", body: changes, auth: true }),
  deleteProduct: (id) => request(`/api/products/${id}/`, { method: "DELETE", auth: true }),
  resetCatalog: () => request("/api/products/reset/", { method: "POST", auth: true }),
  // admin login
  login: (username, password) => request("/api/auth/login/", { method: "POST", body: { username, password } }),
  // orders
  createOrder: (order) => withOptionalCustomerAuth("/api/orders/", { method: "POST", body: order }),
  getOrder: (reference) => request(`/api/orders/${reference}/`),
  getOrders: () => request("/api/orders/", { auth: true }),
  updateOrderStatus: (reference, status) =>
    request(`/api/orders/${reference}/`, { method: "PATCH", body: { status }, auth: true }),
  getPaymentMethods: () => request("/api/payment-methods/"),
  uploadProductImage: (id, file) => {
    const form = new FormData();
    form.append("image", file);
    return request(`/api/products/${id}/image/`, { method: "POST", body: form, auth: true });
  },
  // customer accounts
  register: (name, email, password) => request("/api/account/register/", { method: "POST", body: { name, email, password } }),
  loginCustomer: (email, password) => request("/api/account/login/", { method: "POST", body: { email, password } }),
  logoutCustomer: () => request("/api/account/logout/", { method: "POST", auth: "customer" }),
  getMe: () => request("/api/account/me/", { auth: "customer" }),
  getMyOrders: () => request("/api/account/orders/", { auth: "customer" }),
  requestPasswordReset: (email) => request("/api/account/password-reset/", { method: "POST", body: { email } }),
  confirmPasswordReset: (uid, token, password) =>
    request("/api/account/password-reset/confirm/", { method: "POST", body: { uid, token, password } }),
  // reviews
  getReviews: (productId) => withOptionalCustomerAuth(`/api/products/${productId}/reviews/`),
  postReview: (productId, review) =>
    request(`/api/products/${productId}/reviews/`, { method: "POST", body: review, auth: "customer" }),
  // contact form + newsletter
  sendContact: (form) => request("/api/contact/", { method: "POST", body: form }),
  subscribeNewsletter: (email) => request("/api/newsletter/subscribe/", { method: "POST", body: { email } }),
  // chat
  chat: (message, history) => request("/api/chat/", { method: "POST", body: { message, history } }),
};
