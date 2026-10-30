-- Order numbers come from a sequence and are assigned by the database itself (the column default),
-- so they are unique without any application-side generation or collision retries. They are
-- sequential and therefore guessable: an order number must never be the only thing that grants
-- access to an order's details.
CREATE SEQUENCE order_number_seq START WITH 100001;

-- "orders", not "order": ORDER is a reserved SQL keyword.
-- access_token is what grants access to an order's details (name, phone, address): a random UUID, also
-- assigned by the database, that the customer gets in the confirmation link - like the cart id cookie, it
-- can't be guessed, unlike the sequential order number.
CREATE TABLE orders (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number VARCHAR(20) NOT NULL DEFAULT 'TT-' || nextval('order_number_seq'),
    access_token UUID NOT NULL DEFAULT gen_random_uuid(),
    status       VARCHAR(20) NOT NULL,
    first_name   VARCHAR(100) NOT NULL,
    last_name    VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address      VARCHAR(500) NOT NULL,
    city         VARCHAR(100) NOT NULL,
    postal_code  VARCHAR(10) NOT NULL,
    notes        VARCHAR(1000),
    total_price  NUMERIC(12, 2) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_orders_order_number UNIQUE (order_number),
    CONSTRAINT uq_orders_access_token UNIQUE (access_token),
    CONSTRAINT chk_orders_status
        CHECK (status IN ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT chk_orders_total_price_non_negative CHECK (total_price >= 0)
);

-- Every descriptive and monetary column is a purchase-time snapshot, so later catalog edits cannot
-- change a past order. The product/variant foreign keys don't weaken that (nothing is read through
-- them); they only prevent hard-deleting catalog rows that orders refer to - deactivate instead.
-- order_id has no ON DELETE CASCADE either: orders are never deleted (cancel instead), and this key
-- rejects deleting an order that has items as a database-level backstop to that rule.
CREATE TABLE order_items (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id            BIGINT NOT NULL REFERENCES orders (id),
    product_id          BIGINT NOT NULL REFERENCES products (id),
    product_variant_id  BIGINT NOT NULL REFERENCES product_variants (id),
    product_name        VARCHAR(200) NOT NULL,
    variant_description VARCHAR(500) NOT NULL,
    product_image       VARCHAR(500),
    sku                 VARCHAR(64) NOT NULL,
    quantity            INTEGER NOT NULL,
    unit_price          NUMERIC(10, 2) NOT NULL,
    total_price         NUMERIC(12, 2) NOT NULL,
    CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_order_items_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT chk_order_items_total_price_matches CHECK (total_price = unit_price * quantity)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);
