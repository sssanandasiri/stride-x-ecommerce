import { useMemo, useState } from "react";
import ProductGrid from "../components/ProductGrid";
import { useProducts } from "../context/ProductsContext";
import productCategories from "../data/productCategories";

/*
  Category tabs — "All" plus one per department in data/productCategories.js.
  Brand filter — the dropdown options are derived from whatever brands
  actually exist in `products` right now, so adding a new brand via the
  admin panel automatically adds it here too, with no code change needed.
  Price range — two number inputs (min/max); a product's effective price
  (sale price if it has one, otherwise regular price) is checked against
  the range. All three filters combine (AND), then feed into ProductGrid.
*/
export default function Shop() {
  const { products } = useProducts();
  const [activeCategory, setActiveCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (brand !== "all" && p.brand !== brand) return false;

      const effectivePrice = p.salePrice ?? p.price;
      if (minPrice !== "" && effectivePrice < Number(minPrice)) return false;
      if (maxPrice !== "" && effectivePrice > Number(maxPrice)) return false;

      return true;
    });
  }, [products, activeCategory, brand, minPrice, maxPrice]);

  const clearFilters = () => {
    setActiveCategory("all");
    setBrand("all");
    setMinPrice("");
    setMaxPrice("");
  };

  const filtersActive = activeCategory !== "all" || brand !== "all" || minPrice !== "" || maxPrice !== "";

  return (
    <>
      <div className="wrap category-tabs">
        <button className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>
          All
        </button>
        {productCategories.map((cat) => (
          <button
            key={cat.id}
            className={activeCategory === cat.id ? "active" : ""}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="wrap shop-filters">
        <label>
          Brand
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="all">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>

        <label>
          Min price
          <input
            type="number"
            min="0"
            placeholder="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </label>

        <label>
          Max price
          <input
            type="number"
            min="0"
            placeholder="Any"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </label>

        {filtersActive && (
          <button type="button" className="btn-text" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <ProductGrid
        products={filtered}
        title="All Shoes & Gear"
        subtitle={`${filtered.length} ${filtered.length === 1 ? "item" : "items"} match your filters.`}
      />
    </>
  );
}
