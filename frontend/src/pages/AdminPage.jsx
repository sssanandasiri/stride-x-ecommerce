import { useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "../api";
import { useProducts } from "../context/ProductsContext";
import { useOrders } from "../context/OrdersContext";
import productCategories from "../data/productCategories";

// Login is now real: a Django staff account (created with `createsuperuser`).
// The backend returns a token which api.js sends with every admin request.

const blankForm = {
  id: "",
  name: "",
  brand: "",
  category: "shoes",
  price: "",
  salePrice: "",
  stock: "",
  badge: "",
  image: "",
  rating: 5,
  reviews: 0,
  sizesText: "",
  originalImage: "",
};

const statusOptions = [
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const paymentLabels = { cod: "Cash on delivery", card: "Card", koko: "Koko", mintpay: "Mintpay", payz: "PayZ" };

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/*
  SIZES IN THE ADMIN FORM: rather than a dynamic "add another size row" UI
  (more moving parts than this needs right now), sizes are typed as plain
  text like "40:5, 41:3, 42:0" — size:stock pairs, comma-separated. These
  two functions convert between that text and the { size, stock }[] shape
  the rest of the app expects. A dynamic multi-row form would be a
  reasonable upgrade later, but this covers the same functionality today.
*/
function parseSizesText(text) {
  if (!text.trim()) return null;
  return text
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [size, stock] = pair.split(":").map((s) => s.trim());
      return { size, stock: Number(stock) || 0 };
    });
}

function sizesToText(sizes) {
  if (!sizes) return "";
  return sizes.map((s) => `${s.size}:${s.stock}`).join(", ");
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => !!getToken());
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const { products, refreshProducts, addProduct, updateProduct, deleteProduct, resetToDefaults } = useProducts();
  const { orders, loadOrders } = useOrders();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState(null); // a photo chosen for upload
  const [orderFilter, setOrderFilter] = useState("active"); // active | cancelled | all

  const stats = useMemo(() => {
    const outOfStock = products.filter((p) => (p.stock ?? 0) <= 0).length;
    const inventoryValue = products.reduce((sum, p) => sum + p.price * (p.stock ?? 0), 0);
    return { total: products.length, outOfStock, inventoryValue };
  }, [products]);

  // If the token expired or is wrong, the API says 401: drop it and show the login again.
  const handleApiError = (err, show) => {
    if (err.status === 401 || err.status === 403) {
      clearToken();
      setAuthed(false);
      setAuthError("Please sign in again.");
    } else {
      show(err.message);
    }
  };

  // Orders and stock change while you have this page open (customers keep ordering),
  // so reload both when you sign in and then every 15 seconds.
  useEffect(() => {
    if (!authed) return undefined;
    const load = () =>
      Promise.all([loadOrders(), refreshProducts()]).catch((err) => handleApiError(err, () => {}));
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleStatusChange = async (order, status) => {
    if (status === "cancelled" && !window.confirm(`Cancel order ${order.id}? Stock will be put back. Refunds for paid orders are manual.`)) {
      return;
    }
    try {
      await api.updateOrderStatus(order.id, status);
      await Promise.all([loadOrders(), refreshProducts()]); // cancelling restocks, so refresh stock too
    } catch (err) {
      handleApiError(err, window.alert);
    }
  };

  // Quick restock: ADD units to what's already there (no need to retype every size).
  const handleRestock = async (product) => {
    const hint = product.sizes
      ? 'Type size:quantity to add, e.g. "41:5" (several at once: "40:3, 41:5")'
      : "How many units do you want to add?";
    const answer = window.prompt(`Restock ${product.name}\n${hint}`);
    if (!answer) return;

    try {
      if (product.sizes) {
        const additions = (parseSizesText(answer) ?? []).filter((a) => a.size && a.stock > 0);
        if (additions.length === 0) {
          window.alert('Please type it like 41:5 (size, a colon, then how many to add).');
          return;
        }
        const merged = product.sizes.map((s) => ({ ...s }));
        additions.forEach((add) => {
          const existing = merged.find((s) => s.size === add.size);
          if (existing) existing.stock += add.stock;
          else merged.push({ size: add.size, stock: add.stock });
        });
        await updateProduct(product.id, { sizes: merged, stock: merged.reduce((sum, s) => sum + s.stock, 0) });
      } else {
        const quantity = Number(answer);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          window.alert("Please enter a whole number above 0.");
          return;
        }
        await updateProduct(product.id, { stock: (product.stock ?? 0) + quantity });
      }
    } catch (err) {
      handleApiError(err, window.alert);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { token } = await api.login(usernameInput, passwordInput);
      setToken(token);
      setAuthed(true);
      setAuthError("");
    } catch (err) {
      setAuthError(err.status === 400 ? "Incorrect username or password." : err.message);
    }
  };

  if (!authed) {
    return (
      <div className="wrap admin-login">
        <h1 className="display">Admin sign in</h1>
        <p className="admin-warning">
          <i className="fas fa-lock"></i>
          Sign in with the staff account you created using <code>createsuperuser</code>.
        </p>
        <form onSubmit={handleLogin} className="admin-login-form">
          <input
            type="text"
            placeholder="Username"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button type="submit" className="btn-primary">Sign in</button>
        </form>
        {authError && <p className="contact-status error">{authError}</p>}
      </div>
    );
  }

  const openAddForm = () => {
    setForm(blankForm);
    setImageFile(null);
    setFormError("");
    setEditingId("new");
  };

  const openEditForm = (product) => {
    setForm({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category || "shoes",
      price: product.price,
      salePrice: product.salePrice ?? "",
      stock: product.stock ?? 0,
      badge: product.badge ?? "",
      image: product.image,
      rating: product.rating ?? 5,
      reviews: product.reviews ?? 0,
      sizesText: sizesToText(product.sizes),
      originalImage: product.image,
    });
    setImageFile(null);
    setFormError("");
    setEditingId(product.id);
  };

  const closeForm = () => {
    setEditingId(null);
    setFormError("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.brand.trim()) {
      setFormError("Name and brand are required.");
      return;
    }
    if (!form.image.trim() && !imageFile) {
      setFormError("Add a photo: upload one, or type an image path.");
      return;
    }
    const price = Number(form.price);
    if (!price || price <= 0) {
      setFormError("Price must be a number greater than 0.");
      return;
    }

    const sizes = form.category === "shoes" ? parseSizesText(form.sizesText) : null;
    const stock = sizes ? sizes.reduce((sum, s) => sum + s.stock, 0) : Number(form.stock);
    if (!sizes && (Number.isNaN(stock) || stock < 0)) {
      setFormError("Stock must be a number 0 or higher.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category,
      price,
      salePrice: form.salePrice === "" ? null : Number(form.salePrice),
      stock,
      sizes,
      badge: form.badge.trim() || null,
    };
    // Only send the image path when it's new or really changed (otherwise we'd overwrite an uploaded photo).
    if (editingId === "new") {
      payload.image = form.image.trim();
      payload.rating = 0;   // star rating and review count are calculated from real customer reviews
      payload.reviews = 0;
    } else if (form.image.trim() && form.image.trim() !== form.originalImage) {
      payload.image = form.image.trim();
    }

    try {
      let savedId = editingId;
      if (editingId === "new") {
        const id = slugify(form.id || form.name) || `product-${Date.now()}`;
        if (products.some((p) => p.id === id)) {
          setFormError(`A product with id "${id}" already exists — try a different name or set a custom id.`);
          return;
        }
        await addProduct({ id, ...payload });
        savedId = id;
      } else {
        await updateProduct(editingId, payload);
      }

      if (imageFile) {
        try {
          await api.uploadProductImage(savedId, imageFile);
          await refreshProducts();
        } catch (uploadErr) {
          // The product itself is saved. Stay in the form (now editing it) so they can retry the photo.
          setEditingId(savedId);
          setForm((f) => ({ ...f, id: savedId }));
          handleApiError(uploadErr, (msg) => setFormError(`Product saved, but the photo upload failed: ${msg}`));
          return;
        }
      }
      closeForm();
    } catch (err) {
      handleApiError(err, setFormError);
    }
  };

  const handleDelete = async (product) => {
    if (window.confirm(`Delete "${product.name}"? This can't be undone.`)) {
      try {
        await deleteProduct(product.id);
      } catch (err) {
        handleApiError(err, window.alert);
      }
    }
  };

  const visibleOrders = orders.filter((o) =>
    orderFilter === "all" ? true : orderFilter === "cancelled" ? o.status === "cancelled" : o.status !== "cancelled"
  );

  return (
    <div className="wrap admin-page">
      <div className="admin-header">
        <div>
          <h1 className="display">Store admin</h1>
          <p className="admin-warning">
            <i className="fas fa-triangle-exclamation"></i>
            Changes here are saved to the MySQL database and visible to every customer.
          </p>
        </div>
        <button className="btn-primary" onClick={openAddForm}>
          <i className="fas fa-plus"></i> Add product
        </button>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <span>Total products</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Out of stock</span>
          <strong className={stats.outOfStock > 0 ? "admin-stat-warn" : ""}>{stats.outOfStock}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Inventory value</span>
          <strong>{stats.inventoryValue.toLocaleString()} LKR</strong>
        </div>
        <div className="admin-stat-card">
          <span>Active orders</span>
          <strong>{orders.filter((o) => o.status !== "cancelled").length}</strong>
        </div>
      </div>

      {editingId && (
        <form className="admin-form" onSubmit={handleFormSubmit}>
          <h3>{editingId === "new" ? "Add a new product" : `Editing: ${form.name}`}</h3>

          <div className="admin-form-grid">
            <label>
              Name
              <input name="name" value={form.name} onChange={handleFormChange} placeholder="Air Jordan 4" />
            </label>
            <label>
              Brand
              <input name="brand" value={form.brand} onChange={handleFormChange} placeholder="Nike" />
            </label>
            <label>
              Category
              <select name="category" value={form.category} onChange={handleFormChange}>
                {productCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </label>
            <label>
              Badge (optional)
              <input name="badge" value={form.badge} onChange={handleFormChange} placeholder="New, -15%, ..." />
            </label>
            <label>
              Price (LKR)
              <input name="price" type="number" min="0" value={form.price} onChange={handleFormChange} />
            </label>
            <label>
              Sale price (optional)
              <input name="salePrice" type="number" min="0" value={form.salePrice} onChange={handleFormChange} />
            </label>

            {form.category === "shoes" ? (
              <label className="checkout-full-width">
                Sizes & stock (e.g. "40:5, 41:3, 42:0")
                <input
                  name="sizesText"
                  value={form.sizesText}
                  onChange={handleFormChange}
                  placeholder="40:5, 41:3, 42:0"
                />
              </label>
            ) : (
              <label>
                Stock quantity
                <input name="stock" type="number" min="0" value={form.stock} onChange={handleFormChange} />
              </label>
            )}

            <label>
              Image path (optional if you upload a photo)
              <input name="image" value={form.image} onChange={handleFormChange} placeholder="/images/your-file.jpg" />
            </label>
            <label className="checkout-full-width">
              Upload a photo (JPG, PNG or WebP, max 5 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {editingId === "new" && (
              <label>
                Custom ID (optional)
                <input name="id" value={form.id} onChange={handleFormChange} placeholder="auto-generated from name if left blank" />
              </label>
            )}
          </div>

          {formError && <p className="contact-status error">{formError}</p>}

          <div className="admin-form-actions">
            <button type="submit" className="btn-primary">
              {editingId === "new" ? "Add product" : "Save changes"}
            </button>
            <button type="button" className="btn-text" onClick={closeForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const outOfStock = (product.stock ?? 0) <= 0;
              return (
                <tr key={product.id}>
                  <td>
                    <div className="admin-table-product">
                      <img src={product.image} alt="" />
                      <div>
                        <span className="pro-brand">{product.brand}</span>
                        <p>{product.name}</p>
                      </div>
                    </div>
                  </td>
                  <td>{productCategories.find((c) => c.id === product.category)?.label ?? product.category}</td>
                  <td>
                    {(product.salePrice ?? product.price).toFixed(2)} LKR
                    {product.salePrice && <del>{product.price.toFixed(2)}</del>}
                  </td>
                  <td>
                    <span className={outOfStock ? "admin-stock admin-stock-out" : "admin-stock"}>
                      {outOfStock ? "Out of stock" : product.stock}
                    </span>
                    {product.sizes && <span className="admin-sizes-hint"> ({sizesToText(product.sizes)})</span>}
                  </td>
                  <td className="admin-table-actions">
                    <button className="btn-text" onClick={() => handleRestock(product)}>Restock</button>
                    <button className="btn-text" onClick={() => openEditForm(product)}>Edit</button>
                    <button className="admin-delete" onClick={() => handleDelete(product)} aria-label={`Delete ${product.name}`}>
                      <i className="fas fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        className="btn-text admin-reset"
        onClick={async () => {
          if (window.confirm("Reset the catalog back to the original demo products? This deletes ALL product changes in the database.")) {
            try {
              await resetToDefaults();
            } catch (err) {
              handleApiError(err, window.alert);
            }
          }
        }}
      >
        Reset catalog to defaults
      </button>

      <section className="admin-orders">
        <h3>Orders</h3>

        <div className="admin-order-tabs" role="tablist">
          {[
            { id: "active", label: "Active", count: orders.filter((o) => o.status !== "cancelled").length },
            { id: "cancelled", label: "Cancelled", count: orders.filter((o) => o.status === "cancelled").length },
            { id: "all", label: "All", count: orders.length },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={orderFilter === tab.id}
              className={orderFilter === tab.id ? "active" : undefined}
              onClick={() => setOrderFilter(tab.id)}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {visibleOrders.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            {orderFilter === "cancelled" ? "No cancelled orders." : "No orders here yet."}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer / ship to</th>
                  <th>Payment</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>
                      {order.shipping.fullName}
                      <br />
                      <small>{order.shipping.phone} · {order.shipping.address}, {order.shipping.city}</small>
                    </td>
                    <td>{paymentLabels[order.paymentMethod] ?? order.paymentMethod} · {order.paymentStatus ?? "—"}</td>
                    <td>{order.items.reduce((sum, i) => sum + i.quantity, 0)} items</td>
                    <td>{Number(order.subtotal).toFixed(2)} LKR</td>
                    <td>
                      {order.status === "pending_payment" ? (
                        <>
                          <span>Awaiting payment</span>{" "}
                          <button className="btn-text" onClick={() => handleStatusChange(order, "cancelled")}>Cancel</button>
                        </>
                      ) : order.status === "cancelled" ? (
                        <span>Cancelled</span>
                      ) : (
                        <select value={order.status} onChange={(e) => handleStatusChange(order, e.target.value)}>
                          {statusOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
