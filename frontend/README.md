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
elsewhere.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home: hero banner, category grid, featured products, trust section. |
| `/products` | Full product catalog. |
| `/products/[slug]` | Product detail: image, info, variant selection with live price/stock. |
| `/categories/[slug]` | Category detail (name/description). Does not list that category's products yet — filtered browsing needs a backend capability that belongs to Phase 4 (Discovery). |
| `/contact` | Static contact information (address, phone, email, Telegram). |

## Project structure and conventions

- `src/app/` — routes (Next.js App Router file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`,
  `not-found.tsx`).
- `src/lib/api/` — all backend communication. Components never call `fetch` directly; they call a function from
  here. `types.ts` mirrors the backend response DTOs.
- `src/lib/format.ts` — shared formatting (Persian-locale prices).
- `src/components/` — components shared across multiple pages (`ProductCard`, `CategoryCard`, `CtaLink`,
  `VariantSelector`, etc.).
  - `src/components/layout/` — site-wide chrome (`Header`, `Footer`), rendered once from the root layout.
  - `src/components/home/` — components used only by the home page.
  - `src/components/product/` — components used only by the product detail page.
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
- `src/lib/format.test.ts` — price formatting edge cases.
- `src/components/home/home-sections.test.tsx` — section-level rendering (populated/empty states), exercising real
  card children rather than mocking them.
- `src/components/image-fallback.test.tsx` — the image/placeholder/`onError` pattern described above.
- `src/components/VariantSelector.test.tsx` — the one component with real interactive/stateful logic.

`async` Server Components (every `page.tsx` that fetches data) are **not** unit-tested — per the Next.js docs for
the installed version, Vitest does not currently support rendering them. Coverage for those belongs to end-to-end
tests once that tooling is adopted (not yet — see `PROJECT.md`).

## Lint, type-check, and build

```bash
npm run lint
npx tsc --noEmit
npm run build
```
