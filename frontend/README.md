# Travel Tools Shop — Frontend

The customer-facing storefront for the Travel Tools Shop. See the repository root `README.md` for monorepo-wide setup
(Docker, backend), `PROJECT.md` for the domain contract and delivery phases, and `CLAUDE.md` for engineering
conventions.

## Stack

Next.js (App Router), React, strict TypeScript, Tailwind CSS v4. Entire UI is Persian and RTL
(`lang="fa" dir="rtl"` on the root layout, Vazirmatn font).

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The backend (see repository root `README.md`) must be running for pages to load real
data — every page fetches from it server-side.

### Configuration

The API base URL is read from the `API_BASE_URL` environment variable, defaulting to `http://localhost:8080` if
unset (see `src/lib/api/config.ts`). Set it in a local `.env.local` file (git-ignored) if your backend runs
elsewhere. Cart calls and placing an order run client-side (unlike every other page fetch, which runs server-side),
because they need the browser's HTTP-only `cartId` cookie, so they instead read `NEXT_PUBLIC_API_BASE_URL` — the `NEXT_PUBLIC_` prefix is required for Next.js to inline a variable into the browser
bundle. Set both variables to the same value if you override the default.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home: hero banner, category grid, featured products, trust section. |
| `/products` | Product catalog with a category/in-stock filter sidebar (a filter drawer below the `lg` breakpoint), a sort toolbar, and pagination, driven by the `search`, `category`, `inStock`, `sort`, and `page` query parameters. Search terms are entered in the site-wide header. |
| `/products/[slug]` | Product detail: image, info, variant selection (no choice shown for a single-variant product) with cart-aware stock and add to cart, plus a full-width description/specifications section below (side by side at desktop). |
| `/categories/[slug]` | Category detail (name/description) with a paginated list of that category's products and a link to filter them in the full catalog. |
| `/contact` | Static contact page: shop address with an embedded OpenStreetMap map and a Neshan directions link, opening hours, and phone/email/Telegram cards. Details live in one `CONTACT` constant in `page.tsx`. |
| `/cart` | Cart: item list with quantity steppers and removal, a header badge kept in sync via shared `CartProvider` state, and a link to checkout. |
| `/checkout` | Checkout: the contact/delivery form next to a summary of the cart (above the form on phones), or the cart's loading, failure, or empty state. After a "cart changed" rejection, the cart is reloaded and ordering stays blocked until that succeeds, so an order is never placed against contents the shopper hasn't seen. Not indexed. |
| `/orders/[accessToken]` | Order confirmation, the page checkout leads to and the shopper's only way back to the order (the token is the secret; see the root README's order contract). Shows the order from the backend, never cached, with a print / save-as-PDF button. Not indexed and sends no referrer, so the token never leaks to other sites. An unknown token shows a not-found page, with HTTP 200 rather than 404: the root `loading.tsx` makes pages stream, and a streamed response's status can't change afterwards. |

## Project structure and conventions

- `src/app/` — routes (Next.js App Router file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`,
  `not-found.tsx`).
- `src/lib/api/` — all backend communication. Components never call `fetch` directly; they call a function from
  here. `types.ts` mirrors the backend response DTOs.
- `src/lib/format.ts` — shared formatting: Persian-locale prices, and dates in the Solar Hijri calendar, always in
  Iran's time zone (pages render on the server, whose own time zone must not decide the date).
- `src/lib/checkoutValidation.ts` — the checkout form's client-side rules, mirroring the backend's (the backend stays
  the authority), its Persian messages, and the `MAX_LENGTHS` both the inputs and the messages use.
- `src/components/` — components shared across multiple pages (`ProductCard`, `CategoryCard`, `CtaLink`,
  `VariantSelector`, etc.).
  - `src/components/layout/` — site-wide chrome (`Header`, `Footer`), rendered once from the root layout, and the
    pieces only it uses. The header holds the global product search (`ProductSearchForm`), pre-filled from the URL's
    `search` parameter by `HeaderSearch`.
  - `src/components/home/` — components used only by the home page.
  - `src/components/icons/` — every SVG icon, one component per file (even single-use ones). Each takes an optional
    `className`; callers set the size.
  - `src/components/product/` — product-specific components: detail page, catalog filters and sort, and
    pagination.
  - `src/components/cart/` — cart-specific components: shared state (`CartProvider`), the header indicator
    (`CartLink`), the cart page content (`CartPageContent`), and the cart's load-error and empty states
    (`CartLoadError`, `EmptyCart`), which checkout shows too.
  - `src/components/checkout/` — the checkout form (`CheckoutForm`) and page content (`CheckoutPageContent`).
  - `src/components/order/` — the order confirmation (`OrderConfirmation`) and its print button (`PrintButton`).
- Shared visual tokens (`accent`, `background`, `foreground`) are defined once in `src/app/globals.css`'s `@theme`
  block. Dark mode applies on screen only, so printing always gives dark text on white paper; printing also leaves out
  the site header and footer (`print:hidden`). Use `print:` variants for anything else that shouldn't be printed. Reuse `CtaLink` for button-styled links rather than duplicating its class list.
- **Image handling**: no image-storage infrastructure exists yet (admin upload is Phase 7 work). Any component
  displaying an image must render a placeholder when the URL is absent *and* recover via the image's `onError`
  event when a present URL fails to load — a non-null URL is not the same as a loadable one. See `ProductCard`,
  `CategoryCard`, and `ProductImage` for the established pattern.

## Tests

```bash
npm run test
```

Vitest + React Testing Library. The suite favors a small number of behavior-focused areas over one test file per
component:

- `src/lib/api/*.test.ts` — API layer: success parsing, error handling, 404 → `notFound()`.
- `src/lib/*.test.ts` — pure helpers: price formatting, URL search-param parsing/building, pagination ranges.
- `src/components/home/home-sections.test.tsx` — section-level rendering (populated/empty states), exercising real
  card children rather than mocking them.
- `src/components/image-fallback.test.tsx` — the image/placeholder/`onError` pattern described above.
- Components with real conditional or interactive logic: `VariantSelector`, `ProductInfo` (including the no-variants
  fallback `VariantSelector` itself can't safely render), `ProductDetailsPanel`, the hero slideshow (`HeroBanner`), the
  header search (`Header`, `ProductSearchForm`), and the catalog controls (`ProductFilters`, `ProductSortSelect`,
  `ProductFilterDrawer`, `Pagination`) — including that each control preserves the rest of the URL state.
- `src/app/contact/page.test.tsx` — the contact page's links, map embed, and opening hours (a synchronous Server
  Component, so it renders under Vitest).
- `src/components/cart/*.test.tsx` — shared cart state (`CartProvider`, including the mutation guard and
  initial-load-failure recovery), the header cart indicator (`CartLink`), and the cart page (`CartPageContent`),
  including quantity changes, removal, and a stock-conflict error anchored to the row that caused it.
- `src/lib/checkoutValidation.test.ts` and `src/components/checkout/*.test.tsx` — checkout rules and messages, the
  form's submission (double-submit guard, backend field and cart rejections, staying blocked until the cart has
  reloaded), and the page's states, run against the real `CartProvider` with a mocked API.
- `src/components/order/*.test.tsx` — the order confirmation's content and the print button.

`async` Server Components (every `page.tsx` that fetches data) can't be rendered as `<Page />` under Vitest — per the
Next.js docs for the installed version, it doesn't support them yet — so most aren't unit-tested; coverage for those
belongs to end-to-end tests once that tooling is adopted (not yet — see `PROJECT.md`). The order confirmation page
is the exception: `src/app/orders/[accessToken]/page.test.tsx` calls the page function directly with mocked data and
renders the JSX it returns, which works because everything it renders is synchronous. It covers what only the page
does — loading the order for the URL's token, passing failures on to the not-found and error pages, and its
`noindex`/`no-referrer` metadata.

## Lint, type-check, and build

```bash
npm run lint
npx tsc --noEmit
npm run build
```
