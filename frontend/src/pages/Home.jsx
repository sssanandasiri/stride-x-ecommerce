import Hero from "../components/Hero";
import ProductGrid from "../components/ProductGrid";
import Banner from "../components/Banner";
import Categories from "../components/Categories";
import Newsletter from "../components/Newsletter";
import Reveal from "../components/Reveal";
import { useProducts } from "../context/ProductsContext";

/*
  REORDERED per your request: Hero, then "Shop by category" right away
  (so people can get where they're going fast), then a New Arrivals
  preview (exactly 8 items, no sort/pagination — see ProductGrid's
  `limit`/`hideSort` props), then the repair/promises Banner, then
  Newsletter. The full catalog with sorting, filters and pagination lives
  on /shop — the homepage is a teaser, not the whole store.
*/
export default function Home() {
  const { products } = useProducts();
  const newArrivals = products.filter((p) => p.badge === "New");

  return (
    <>
      <Hero />

      <Reveal as="div">
        <Categories />
      </Reveal>

      <ProductGrid
        products={newArrivals}
        title="New arrivals"
        subtitle="Just landed — get them before they're gone."
        limit={8}
        hideSort
        viewAllLink="/new-drops"
      />

      <Reveal as="div">
        <Banner />
      </Reveal>

      <Reveal as="div">
        <Newsletter />
      </Reveal>
    </>
  );
}
