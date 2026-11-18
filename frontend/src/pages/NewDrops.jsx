import ProductGrid from "../components/ProductGrid";
import { useProducts } from "../context/ProductsContext";

export default function NewDrops() {
  const { products } = useProducts();
  const newProducts = products.filter((p) => p.badge === "New");
  return (
    <ProductGrid
      products={newProducts}
      title="New drops"
      subtitle="Just landed — get them before they sell out."
    />
  );
}
