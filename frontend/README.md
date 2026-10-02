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
elsewhere. Cart calls run client-side (unlike every other page fetch, which runs server-side), so they instead read
`NEXT_PUBLIC_API_BASE_URL` — the `NEXT_PUBLIC_` prefix is required for Next.js to inline a variable into the browser
bundle. Set both variables to the same value if you override the default.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home: hero banner, category grid, featured products, trust section. |
| `/products` | Product catalog with a category/in-stock filter sidebar (a filter drawer below the `lg` breakpoint), a sort toolbar, and pagination, driven by the `search`, `category`, `inStock`, `sort`, and `page` query parameters. Search terms are entered in the site-wide header. |
| `/products/[slug]` | Product detail: image, info, variant selection (no choice shown for a single-variant product) with cart-aware stock and add to cart, plus a full-width description/specifications section below (side by side at desktop). |
| `/categories/[slug]` | Category detail (name/description) with a paginated list of that category's products and a link to filter them in the full catalog. |
| `/contact` | Static contact page: shop address with an embedded OpenStreetMap map and a Neshan directions link, opening hours, and phone/email/Telegram cards. Details live in one `CONTACT` constant in `page.tsx`. |
| `/cart` | Cart: item list with quantity steppers and removal, a header badge kept in sync via shared `CartProvider` state. No checkout yet — that's Phase 6. |

## Project structure and conventions

- `src/app/` — routes (Next.js App Router file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`,
  `not-found.tsx`).
- `src/lib/api/` — all backend communication. Components never call `fetch` directly; they call a function from
  here. `types.ts` mirrors the backend response DTOs.
- `src/lib/format.ts` — shared formatting (Persian-locale prices).
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
    (`CartLink`), and the cart page content (`CartPageContent`).
- Shared visual tokens (`accent`, `background`, `foreground`) are defined once in `src/app/globals.css`'s `@theme`
  block. Reuse `CtaLink` for button-styled links rather than duplicating its class list.
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

`async` Server Components (every `page.tsx` that fetches data) are **not** unit-tested — per the Next.js docs for
the installed version, Vitest does not currently support rendering them. Coverage for those belongs to end-to-end
tests once that tooling is adopted (not yet — see `PROJECT.md`).

## Lint, type-check, and build

```bash
npm run lint
npx tsc --noEmit
npm run build
```
