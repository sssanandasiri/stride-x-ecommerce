import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroSlides from "../data/heroSlides";
import { useProducts } from "../context/ProductsContext";
import { classifyImage, getKind, rememberKind } from "../lib/imageKind";
import "./Hero.css";

const SLIDE_DURATION = 7000; // ms per product. Keep equal to the animation fallback in Hero.css
const MAX_SLIDES = 5;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/*
  The hero now showcases REAL products from your catalog: in stock, with a picture, new drops first,
  then discounted ones, then the rest. If you have none yet, it falls back to the text in
  data/heroSlides.js (see FallbackHero below).
*/
function pickFeatured(products, count) {
  const rank = (p) => (p.badge?.toLowerCase() === "new" ? 0 : p.salePrice != null ? 1 : 2);
  return products
    .filter((p) => p.image && p.stock > 0)
    .sort((a, b) => rank(a) - rank(b)) // stable: the shop's own order is kept inside each group
    .slice(0, count);
}

// Big faint word behind the shoe. "New Balance" would be far too wide, so multi-word brands use initials.
const watermarkOf = (brand) => {
  const words = brand.trim().split(/\s+/);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : brand).toUpperCase();
};

/* The floating sneaker. It looks at the picture once to decide how to blend it in (see lib/imageKind.js). */
function Shoe({ product }) {
  const [kind, setKind] = useState(() => getKind(product.image)); // null until we've looked
  const [useCors, setUseCors] = useState(true);

  const handleLoad = (e) => {
    if (kind) return;
    const found = useCors ? classifyImage(e.currentTarget) : "photo";
    rememberKind(product.image, found);
    setKind(found);
  };
  // Reading a picture's pixels needs the server's permission. If the browser refuses the picture,
  // load it again without asking, and just show it as a normal photo.
  const handleError = () => setUseCors(false);

  return (
    <div className={`hx-shoe hx-kind-${kind ?? "pending"}`}>
      <div className="hx-shoe-img">
        <img
          key={useCors ? "cors" : "plain"}
          src={product.image}
          alt={product.name}
          crossOrigin={useCors ? "anonymous" : undefined}
          onLoad={handleLoad}
          onError={handleError}
          decoding="async"
        />
      </div>
    </div>
  );
}

function SideCard({ product, direction, onClick }) {
  return (
    <button
      className={`hx-side hx-side--${direction}`}
      onClick={onClick}
      aria-label={`${direction === "next" ? "Next" : "Previous"}: ${product.name}`}
    >
      {direction === "prev" && <i className="fas fa-chevron-left hx-side-arrow" aria-hidden="true"></i>}
      <img src={product.image} alt="" />
      <span className="hx-side-text">
        <small>{product.brand}</small>
        <strong>{product.name}</strong>
      </span>
      {direction === "next" && <i className="fas fa-chevron-right hx-side-arrow hx-side-arrow--orange" aria-hidden="true"></i>}
    </button>
  );
}

function ShowcaseHero({ featured }) {
  const total = featured.length;
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(prefersReducedMotion); // no autoplay if the visitor asked for less motion
  const [hovering, setHovering] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const panelRef = useRef(null);
  const touchStartX = useRef(null);

  const current = index % total;
  const product = featured[current];
  const prev = featured[(current - 1 + total) % total];
  const next = featured[(current + 1) % total];
  const paused = userPaused || hovering || focusInside;
  const price = product.salePrice ?? product.price;
  const sized = product.sizes?.filter((s) => s.stock > 0).map((s) => s.size) ?? [];

  const go = (n) => setIndex((n + total) % total);

  const goToCategories = (e) => {
    e.preventDefault();
    // "catrgories" (sic) matches the real id on Categories.jsx's <section>
    document.getElementById("catrgories")?.scrollIntoView({ behavior: "smooth" });
  };

  // Pointer parallax: write two CSS variables straight to the DOM (no React re-render per mouse move).
  const handlePointerMove = (e) => {
    if (e.pointerType !== "mouse" || prefersReducedMotion() || !panelRef.current) return;
    const box = panelRef.current.getBoundingClientRect();
    panelRef.current.style.setProperty("--px", (((e.clientX - box.left) / box.width) * 2 - 1).toFixed(3));
    panelRef.current.style.setProperty("--py", (((e.clientY - box.top) / box.height) * 2 - 1).toFixed(3));
  };
  const resetParallax = () => {
    panelRef.current?.style.setProperty("--px", "0");
    panelRef.current?.style.setProperty("--py", "0");
  };

  return (
    <section
      className="hx"
      aria-roledescription="carousel"
      aria-label="Featured products"
      // Pause while a MOUSE hovers or the KEYBOARD is inside. Touch taps and mouse clicks must not leave
      // the slideshow stuck in "paused".
      onPointerEnter={(e) => setHovering(e.pointerType === "mouse")}
      onPointerLeave={() => setHovering(false)}
      onFocus={(e) => setFocusInside(e.target.matches?.(":focus-visible") ?? false)}
      onBlur={() => setFocusInside(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div
        className="hx-panel"
        ref={panelRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetParallax}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="hx-glow" aria-hidden="true"></div>

        {/* key = product id: React rebuilds this scene on each slide, which replays the entrance animations */}
        <div className="hx-scene" key={product.id} role="group" aria-roledescription="slide" aria-label={`${current + 1} of ${total}`}>
          <div className="hx-watermark" aria-hidden="true">{watermarkOf(product.brand)}</div>

          <div className="hx-copy" aria-live={paused ? "polite" : "off"}>
            <h1 className="hx-title display">{product.name}</h1>
            <p className="hx-chips">
              {product.badge && <span className="hx-badge">{product.badge}</span>}
              {product.salePrice != null && <span className="hx-badge hx-badge--sale">Sale</span>}
            </p>
            {product.sizes ? (
              <div className="hx-sizes">
                <small>Sizes in stock</small>
                <span>
                  {sized.slice(0, 8).map((s) => <i key={s}>{s}</i>)}
                  {sized.length > 8 && <i>+{sized.length - 8}</i>}
                </span>
              </div>
            ) : (
              <div className="hx-sizes"><small>{product.brand}</small><span><i>{product.category}</i></span></div>
            )}
          </div>

          <div className="hx-floor" aria-hidden="true"></div>
          <Shoe product={product} />

          <div className="hx-buy">
            <div className="hx-price">
              <strong>{price.toFixed(2)} LKR</strong>
              {product.salePrice != null && <del>{product.price.toFixed(2)}</del>}
            </div>
            <Link className="hx-cta" to={`/product/${product.id}`}>
              {product.sizes ? "Shop this pair" : "Shop this item"}
            </Link>
          </div>

          <a href="#catrgories" className="hx-explore" onClick={goToCategories}>Browse by category</a>

          {total > 1 && (
            <>
              <SideCard product={prev} direction="prev" onClick={() => go(index - 1)} />
              <SideCard product={next} direction="next" onClick={() => go(index + 1)} />
            </>
          )}
        </div>

        {total > 1 && (
          <div className="hx-nav">
            <div className="hx-segments">
              {featured.map((p, i) => (
                <button
                  key={p.id}
                  className={`hx-segment${i === current ? " is-active" : ""}${i < current ? " is-done" : ""}`}
                  aria-label={`Show ${p.name}`}
                  aria-current={i === current}
                  onClick={() => go(i)}
                >
                  {i === current && (
                    <span
                      key={current}
                      className="hx-segment-fill"
                      style={{ animationDuration: `${SLIDE_DURATION}ms`, animationPlayState: paused ? "paused" : "running" }}
                      // The bar's CSS animation IS the timer: when it ends we move on. Pausing the animation
                      // pauses the slideshow, and resuming continues exactly where it stopped.
                      onAnimationEnd={() => go(index + 1)}
                    ></span>
                  )}
                </button>
              ))}
            </div>
            <button
              className="hx-pause"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
              aria-pressed={userPaused}
            >
              <i className={userPaused ? "fas fa-play" : "fas fa-pause"}></i>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// Shown when the shop has no in-stock product with a picture yet: text + photo from data/heroSlides.js.
function FallbackHero() {
  const slide = heroSlides[0];
  const navigate = useNavigate();
  return (
    <section className="hx" aria-label="Welcome">
      <div className="hx-panel hx-panel--fallback">
        <div className="hx-glow" aria-hidden="true"></div>
        <div className="hx-fb-copy">
          <h1 className="hx-title display">{slide.titleLines.join(" ")}</h1>
          <p className="hx-fb-desc">{slide.description}</p>
          <div className="hx-fb-ctas">
            <button className="hx-cta" onClick={() => navigate("/shop")}>{slide.primaryCta}</button>
          </div>
        </div>
        <img className="hx-fb-photo" src={slide.image} alt={slide.alt} />
      </div>
    </section>
  );
}

export default function Hero() {
  const { products, loading } = useProducts();
  const featured = useMemo(() => pickFeatured(products, MAX_SLIDES), [products]);

  // While the catalog loads, show an empty dark panel of the same size so the page doesn't jump.
  if (loading) {
    return (
      <section className="hx" aria-hidden="true">
        <div className="hx-panel"></div>
      </section>
    );
  }
  return featured.length > 0 ? <ShowcaseHero featured={featured} /> : <FallbackHero />;
}
