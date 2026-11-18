import { useSearchParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { useProducts } from "../context/ProductsContext";

/*
  REACT CONCEPT: reading the URL's query string
  useSearchParams gives you the ?q=... part of the URL as a get/set pair,
  similar to useState but backed by the address bar instead of memory —
  that's what makes a search results page shareable/bookmarkable as a link.
*/
export default function SearchResults() {
  const { products } = useProducts();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const lowerQuery = query.toLowerCase();

  const matches = lowerQuery
    ? products.filter(
        (p) => p.name.toLowerCase().includes(lowerQuery) || p.brand.toLowerCase().includes(lowerQuery)
      )
    : [];

  return (
    <ProductGrid
      products={matches}
      title={query ? `Results for "${query}"` : "Search"}
      subtitle={query ? `${matches.length} ${matches.length === 1 ? "match" : "matches"} found.` : "Use the search icon above to look for a product."}
    />
  );
}
