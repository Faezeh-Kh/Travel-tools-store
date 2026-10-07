# Travel Tools Shop

A production-oriented travel/camping/outdoor store MVP for Persian-speaking customers, built as a maintainable Spring Boot learning and public portfolio project. See `PROJECT.md` for the domain contract and delivery phases, and `CLAUDE.md` for engineering conventions.

**Status:** Phases 1–5 (Foundation through Cart) are functionally complete; Phase 6 (Checkout/orders) is next.

- **Storefront and discovery:** home, catalog, product/category detail pages with a photo gallery and variant
  selection, site-wide header/footer, and a static contact page — Persian/RTL throughout, prices in Toman. The catalog
  supports search (from the site-wide header), category and in-stock filters, sorting, and pagination.
- **Cart:** an anonymous, cookie-identified cart with add/update/remove, server-calculated totals, and advisory stock
  checks. Concurrent mutations of the same cart are serialized with a pessimistic lock. The frontend shows a header
  badge, a cart page, and add-to-cart on product pages, kept in sync across browser tabs.
- **Development data:** a dev-only catalog seed generated from a product sheet (see below).

Checkout/orders (Phase 6), administration with authentication (Phase 7), and hardening (Phase 8) are not started.
Until Phase 7, there is no admin UI or authentication; catalog data comes from migrations and the dev seed.

## Architecture and stack

Monorepo with two independently runnable applications:

- `backend/travelTools` — Java 21, Spring Boot 4, Spring Web (MVC), Spring Data JPA, Bean Validation, Flyway, PostgreSQL, Maven.
- `frontend` — Next.js (App Router), React, strict TypeScript, Tailwind CSS.

Local infrastructure (PostgreSQL) runs via Docker Compose; both applications run directly on the developer machine.

## Prerequisites

- Java 21
- Node.js 20+ and npm
- Docker (with Compose) for local PostgreSQL and for backend integration tests (Testcontainers)

## Configuration

The backend reads its configuration from environment variables, with local-friendly defaults matching Docker Compose
and the frontend dev server:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `travel_tools` | Database name |
| `DB_USER` | `travel_tools` | Database user |
| `DB_PASSWORD` | `travel_tools` | Database password |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | The single origin allowed by CORS for `/api/**`. Credentialed requests (the cart cookie) require an explicit origin, not `*`. |
| `CART_COOKIE_SECURE` | `false` | Sets the `Secure` flag on the `cartId` cookie. Keep `false` for local HTTP; set `true` behind HTTPS. |

The frontend has its own variables (`API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`); see `frontend/README.md`.

Copy `.env.example` to `.env` at the repository root and adjust values if needed; `.env` is used by Docker Compose and is git-ignored.

```bash
cp .env.example .env
```

## Local database (Docker Compose)

Starts a single PostgreSQL 18 container:

```bash
docker compose up -d
```

Stop it with `docker compose down` (add `-v` to also drop the data volume).

## Backend

```bash
cd backend/travelTools
./mvnw spring-boot:run
```

Schema is managed exclusively by Flyway migrations under `src/main/resources/db/migration`.

### Development catalog data

Until admin product management exists, local catalog data comes from the product sheet
`scripts/seed/products_seed.xlsx` and its CSV export `scripts/seed/products_seed.csv`. Run the backend with the `dev`
profile to load it:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The `dev` profile adds `src/main/resources/db/seed/R__dev_catalog_seed.sql` to the Flyway locations. It is a
repeatable migration: Flyway re-applies it whenever its content changes, and it upserts by product slug and variant
SKU, deactivating products and variants that are no longer in the sheet (including the V2 sample products). Without
the profile, no seed runs, so production and tests never see this data.

The SQL file is generated; regenerate it after changing the sheet instead of editing it by hand. From the repository
root, with Python 3 (standard library only):

```bash
python scripts/seed/generate_catalog_seed.py scripts/seed/products_seed.csv
python -m unittest discover scripts/seed   # generator tests
```

Sheet rules, which the script checks and reports by row number:

- Export the sheet as **CSV UTF-8**. Columns: `نام محصول`, `Slug`, `SKU`, `دسته‌بندی`, `توصیف کوتاه`, `مشخصات`,
  `قیمت واحد`, `تعداد موجودی`.
- Each row is one variant. Rows sharing a slug are one product and must share name, category, short description, and
  specification names. Specifications whose values differ between those rows become the variants' attributes.
- `مشخصات` format: `name: value; name: value1، value2;`. Multiple values are separated by `,` or `،`.
- Category must be one of the existing category names. Slugs are lowercase kebab-case and SKUs uppercase; treat both
  as permanent, because changing one creates a new product or variant and deactivates the old one.
- Product images live in `frontend/public/images/products/`, named after a variant's SKU: `<SKU>.webp` for one photo,
  `<SKU>.1.webp`, `<SKU>.2.webp`, ... for several (WebP, at most 1200px wide, to keep the repository and pages light). A product shows the photos of all its variants. The script lists
  image files that match no SKU.

### Backend tests

```bash
cd backend/travelTools
./mvnw test
```

Integration tests boot the full Spring context against a real, ephemeral PostgreSQL container via Testcontainers (`@ServiceConnection`) — no H2 substitution. Docker must be running.

### Backend build

```bash
cd backend/travelTools
./mvnw clean verify
```

## Frontend

See `frontend/README.md` for routes, project structure/conventions, and the frontend testing approach.

```bash
cd frontend
npm install
npm run dev
```

### Frontend tests

```bash
cd frontend
npm run test
```

Uses Vitest and React Testing Library.

### Frontend lint, type-check, and build

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

## API documentation

Published via springdoc-openapi while the backend is running:

- OpenAPI 3.1 document: `http://localhost:8080/v3/api-docs`
- Interactive Swagger UI: `http://localhost:8080/swagger-ui/index.html`

Endpoints implemented so far:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/categories` | List active categories, ordered by name. Includes an optional `imageUrl`. |
| GET | `/api/products` | Paginated list of active products, each with a single price or a min/max range across its active variants. Query parameters below. |
| GET | `/api/products/{slug}` | Product detail: full description, images, specifications, category, and active purchasable variants. 404 if the slug is unknown or the product is inactive. |
| GET | `/api/cart` | The current cart (from the `cartId` cookie). Returns an empty cart when there is no cookie or the cart is unknown; never creates one. |
| POST | `/api/cart/items` | Add `{productVariantId, quantity}`. Creates the cart on first use and sets the `cartId` cookie. Adding an existing variant increases its quantity. |
| PATCH | `/api/cart/items/{itemId}` | Set an item's quantity: `{quantity}` (≥ 1). |
| DELETE | `/api/cart/items/{itemId}` | Remove an item. |

`GET /api/products` query parameters (all optional):

| Parameter | Default | Description |
| --- | --- | --- |
| `search` | — | Case-insensitive partial match on name or description (max 200 characters). |
| `category` | — | Category slug. |
| `inStock` | `false` | When `true`, only products with an active variant in stock. |
| `sort` | name | `newest`, `price-asc`, or `price-desc`. Without it, products are ordered by name; ties are always broken by name. |
| `page` | `0` | Zero-based page index. |
| `size` | `20` | Page size, 1–100. |

The response is `{items, page, size, totalElements, totalPages}`.

**Cart contract.** The cart is anonymous and identified by an HTTP-only, `SameSite=Lax` `cartId` cookie (30 days),
refreshed on every mutation. All cart endpoints return the full cart (`{id, items, subtotal, totalPrice}`). Prices and
totals are always calculated on the server from current variant prices and never taken from the client. Requests for
an unknown, inactive, or not-owned variant, cart, or item return 404. A quantity above the variant's current stock
returns 409. This stock check is advisory feedback, not a reservation. Checkout must re-validate stock when it creates
the order.

Errors use a consistent JSON shape (`{timestamp, status, code, message, fieldErrors}`) for both application errors and
framework-level ones (unmapped routes, wrong HTTP methods, malformed requests), via a global exception handler that hides
internal exception/database details. Codes: `NOT_FOUND` (404), `CONFLICT` (409), `VALIDATION_ERROR` (400, with
`fieldErrors`), `REQUEST_ERROR` (other framework-level errors, e.g. unmapped routes or unsupported methods), and `INTERNAL_ERROR` (500).
