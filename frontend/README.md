# StrideX — React conversion

## Latest changes in this version

- **Real product catalog** — rebuilt to match your actual `public/images/`
  files: Nike, Converse and New Balance (18 products total across shoes
  + belts/wallets/socks/care), replacing the old placeholder-image set.
  This also makes the brand filter on `/shop` actually do something,
  since there's more than one brand now.
- **Homepage reordered**: Hero → Shop by category → New Arrivals (8
  items, no sort/pagination clutter) → Repair & promises banner →
  Newsletter. The full catalog with sorting/filtering/pagination still
  lives on `/shop`.
- **Category tiles** changed from Casual/Trendy/Sports to **Men / Women /
  Unisex / Kids / Accessories**. Heads up: these are navigational only
  right now (they link to `/shop`, not a filtered view) since products
  don't carry a gender/age tag yet — see the comment in
  `data/categories.js` if you want to add that later.
- **Repair banner** now lists what the shop actually promises (fast
  turnaround, guarantee, etc.) and calls out the installment payment
  options (Koko/Mintpay/PayZ) right there too.
- **Hero slideshow** upgraded: pauses on hover, each dot now shows a
  filling progress bar instead of just a static dot, and the CTA buttons
  actually do something (shop / scroll to categories) instead of being dead.
- **Scroll-reveal animation** — a new `<Reveal>` component
  (`src/components/Reveal.jsx`) fades + slides content in as it scrolls
  into view, with a staggered cascade on product cards. Respects
  `prefers-reduced-motion`.
- Fixed a small pre-existing bug: the homepage category tiles used a
  plain `<a href="/shop">`, causing a full page reload — now a proper
  React Router `Link`.


Your homepage, rebuilt in React (Vite), with a full set of pages, cart/
wishlist/search, sizes, checkout, order history, an admin panel, and a
chat widget.

## Run it

```
cd stridex-react
npm install
npm run dev
```

Then open the local URL it prints (usually http://localhost:5173).

Before it'll look right, drop your actual image files into
`public/images/` — see the README.txt in there for the exact filenames
the code expects.

## What's where

```
src/
  main.jsx             entry point — mounts <App /> wrapped in every Provider
  App.jsx              layout: Header + Routes + Footer + ChatWidget
  index.css             stylesheet
  pages/                 one file per route
  components/            reusable pieces (Header, Hero, ProductGrid,
                        CartDrawer, SearchOverlay, ChatWidget, ...)
  context/                CartContext, WishlistContext, ProductsContext,
                        OrdersContext, ToastContext — shared state,
                        localStorage-backed for now
  data/                   seed content — the starting catalog/categories
  lib/chatbotEngine.js    the chat widget's keyword-matching "brain"
```

## Pages

- **/** Home, **/shop** (category tabs + sort + pagination), **/new-drops**,
  **/about**, **/contact**
- **/product/:id** — size selector (for shoes), quantity, wishlist, stock-aware add to cart
- **/cart** — adjust quantity, remove items, subtotal, goes to checkout
- **/checkout** — shipping form + payment method selection
- **/order-confirmation** — order summary after checkout
- **/wishlist**, **/search?q=...**
- **/admin** — password-gated: add/edit/delete products, manage
  stock/sizes/discounts, see recent orders
- Any unmatched URL → a proper 404 page

## What's genuinely functional right now (frontend-only)

- **Cart & wishlist** — slide-in drawer, full pages, localStorage-persisted
- **Search** — live-filtering overlay + full results page
- **Sizes** — shoes require picking an in-stock size before adding to
  cart; stock is tracked per size, not just per product
- **Categories** — shoes/belts/wallets/socks/care, filterable on /shop
- **Toasts** — a small confirmation appears (bottom-left) on add to
  cart/wishlist
- **Checkout** — real shipping-details form + payment method picker
  (Cash on delivery, Card, Koko, Mintpay, PayZ), ending in an order
  confirmation. **No real payment is processed** — see the big caveat below.
- **Admin panel** — dashboard stats, full product CRUD including sizes,
  and a table of orders placed in this browser
- **Chat widget** — bottom-right floating button; answers real stock/
  price/category/sale questions by reading your live product data (not
  an LLM yet — see the caveat below)

## Two caveats worth actually reading

**Payments aren't real yet.** Koko/Mintpay/PayZ/Card are all selectable
on `/checkout`, and placing an order logs a full record (shipping info,
items, chosen method) to `OrdersContext` — but nothing is actually
charged. Real integration means: your Django backend holds each
provider's merchant API secret (never in frontend code), your backend
calls their API when an order is placed, and only confirms the order
once the provider confirms payment (often via a redirect back to your
site or a webhook). `CheckoutPage.jsx`'s `handlePlaceOrder` is exactly
where that backend call goes.

**The chat widget isn't AI yet.** It's real keyword/word-overlap
matching against your actual product data in `lib/chatbotEngine.js` — so
it correctly answers "is the Dunk Low in stock?" by checking real stock,
which is more useful than it sounds, but it can't hold a conversation or
handle phrasing it wasn't written for. Swapping in a real LLM later means
replacing the body of `getBotReply()` with a `fetch()` to a `/api/chat`
Django endpoint (which calls an LLM with tool-calling against your
product API) — `ChatWidget.jsx` itself doesn't need to change, since it
just calls `getBotReply()` and renders whatever comes back.

**Admin panel, same limitation as before:** changes save to
`localStorage`, so only the browser you edited in sees them. Demo
password: `stridex2026`, shown on the login screen.

## Bugs fixed from your original code

Newsletter class-name typo, mobile menu icon not updating, dead "Quick
View" code, malformed footer HTML, dead `href="#"` nav links — all
listed in earlier commits/conversation if you want the full detail.

## React concepts used (see comments in the code for more)

- **Components, state, effects** — throughout
- **Context** — `CartContext`, `WishlistContext`, `ProductsContext`,
  `OrdersContext`, `ToastContext`: shared data reachable from any
  component via `useX()` hooks, no prop drilling
- **React Router** — routes, dynamic `:id`, `useSearchParams`,
  `useLocation`/navigation state (used to pass the order from checkout
  to the confirmation page), and a `path="*"` catch-all for 404s
- **Composite keys** — cart lines are keyed by product id *and* size, so
  the same shoe in two sizes is two separate lines, not merged into one

## Suggested next steps, in order

1. Drop images into `public/images/`, run `npm run dev`, walk through:
   add a sized shoe to cart, check out with a payment method, see the
   order show up in `/admin`.
2. Start the Django backend: product endpoints, a real login for
   `/admin`, and an orders endpoint. `ProductsContext`/`OrdersContext`
   are exactly where those API calls replace localStorage.
3. Pick one payment provider (Koko, Mintpay, PayZ, or a card processor)
   and integrate it server-side first — don't try all four at once.
4. Build `/api/chat` in Django, connect it to an LLM with tool-calling
   against your product API, and swap it into `chatbotEngine.js`.
