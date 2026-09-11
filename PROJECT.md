# Travel Tools Shop

A production-oriented travel/camping/outdoor store MVP for Persian-speaking customers, built as a maintainable Spring Boot learning and public portfolio project. Prioritize mobile usability, discovery, and simple checkout. CLAUDE.md defines engineering and verification rules.

## Stack and architecture

- Backend: Java 21, Spring Boot/Web/Data JPA/Security, Jakarta Bean Validation, PostgreSQL, Flyway, Maven, OpenAPI/Swagger.
- Tests: JUnit 5, Mockito, Spring Boot Test, PostgreSQL Testcontainers; Vitest and React Testing Library for frontend tests.
- Frontend: Next.js, React, strict TypeScript, Tailwind CSS. Select stable compatible versions.
- Modular monolith, package-by-feature. Separate API, application, domain, and persistence responsibilities without mandatory sublayers or empty scaffolding; preserve useful domain boundaries for future expansion.
- Docker Compose initially runs PostgreSQL only; backend and frontend run directly on the developer machine during normal development. Defer deployment and image-storage infrastructure until needed.
- Use a single monorepo with `backend/` and `frontend/` as top-level directories. Both applications must remain independently runnable and buildable.

## Domain contract

| Model | Fields |
| --- | --- |
| Product | id, name, slug, shortDescription, description, category, images, specifications, active, createdAt, updatedAt |
| ProductVariant | id, product, sku, attributes (e.g. color/size/capacity), price, stockQuantity, active, createdAt, updatedAt |
| Category | id, name, slug, description, active |
| Cart | id, items, createdAt, updatedAt; calculated subtotal, totalPrice |
| CartItem | id, cart, productVariant, quantity; calculated unitPrice, totalPrice |
| Order | id, orderNumber, status, items, firstName, lastName, phoneNumber, address, city, postalCode, notes (optional), totalPrice, createdAt, updatedAt |
| OrderItem | id, order, productId, productVariantId, productName, variantDescription, sku, quantity, unitPrice, totalPrice |

These are domain attributes, not a mandatory database-column layout. Each Cart owns its CartItems; each Order owns its OrderItems. Cart prices/totals are calculated from current variant prices, not stored as authoritative values. OrderItem descriptive and monetary fields are purchase-time snapshots; Order stores the submitted contact/delivery details and purchase total. Address fields may be grouped into a value object. Select anonymous cart identification and storage during the cart phase; no customer account is required.

Price and stock belong exclusively to variants. Products without options have one default variant; purchasing requires an active variant available for sale. Product/category slugs and variant SKUs are unique. Money uses decimal values.

Categories are database-managed. Initial categories: Camping & Shelter, Camping Furniture, Cooking & Food, Lighting & Power, Travel Accessories.

## Shopping flow

**Catalog:** Show active products once each, with a common variant price or minimum/range. Details allow selection of active purchasable variants. Search names/descriptions using PostgreSQL case-insensitive partial matching; filter by category/in-stock; sort by price ascending/descending or newest; paginate.

**Cart:** Add/remove variants, change quantities, show subtotal/total. Server validates existence, product/variant availability, quantity, and stock; calculates totals from current authoritative prices, never client prices.

**Checkout:** Collect first/last name, phone, address, city, postal code, optional notes. Keep order creation decoupled for future payments; build no payment-provider infrastructure now.

**Orders:** Assign unique human-readable numbers. Snapshot productId, productVariantId, productName, variantDescription, sku, quantity, unitPrice, totalPrice; subsequent catalog changes cannot alter purchases. Statuses: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED.

**Administration:** Authenticated, authorized admins create/edit/deactivate products, variants, and categories; update variant prices/stock; view orders and change status. Customer browsing is anonymous; defer registration while allowing future accounts.

## Storefront and documentation

Entire customer UI: Persian, correctly formatted, RTL, mobile-first through desktop. Public product/category pages use descriptive slug URLs, titles, meta descriptions, and useful structured metadata. Choose appropriate Next.js server rendering/static generation/caching; client components only where interactivity requires them, without forced dynamic SSR.

Publish OpenAPI contracts including validation/authentication. Maintain README with overview, architecture/stack, prerequisites, configuration, local database/Docker setup, application startup, tests, and API documentation.

## Delivery sequence

1. Foundation: repository, applications, PostgreSQL/Compose, Flyway, tests, and basic lint/static-quality tooling using the chosen stack's standard capabilities.
2. Product/Variant/Category: persistence, migrations, CRUD services, public catalog API, tests.
3. Storefront: home, catalog, categories, details/variant selection, responsive Persian RTL.
4. Discovery: search, filters, sorting, pagination.
5. Cart: variant operations, totals, stock validation.
6. Checkout/orders: form, creation, snapshots, confirmation, numbers, statuses.
7. Administration: authentication/authorization and management APIs.
8. Hardening: security, architecture, performance, accessibility, SEO, tests, documentation reviews. Quality rules apply throughout.

## Scope boundary

Unless explicitly requested, exclude customer registration, real payments, social login, reviews, wishlists, discounts/loyalty, recommendations/AI, advanced analytics, multi-vendor selling, and multiple warehouses.

No microservices, Kubernetes, dedicated search engine, event-driven architecture, or speculative services/frameworks (including Redis, Kafka/RabbitMQ, GraphQL, CQRS, event sourcing). Add infrastructure and abstractions only for concrete requirements.