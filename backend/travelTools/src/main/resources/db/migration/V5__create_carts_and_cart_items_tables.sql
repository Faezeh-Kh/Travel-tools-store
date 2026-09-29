-- Cart ids are random UUIDs (not sequential BIGINTs) because a cart's id is handed to the client
-- as an HttpOnly cookie granting access to it; a guessable/sequential id would let one visitor
-- enumerate other customers' carts.
CREATE TABLE carts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cart_id            UUID NOT NULL REFERENCES carts (id),
    product_variant_id BIGINT NOT NULL REFERENCES product_variants (id),
    quantity           INTEGER NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cart_items_cart_variant UNIQUE (cart_id, product_variant_id),
    CONSTRAINT chk_cart_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items (cart_id);
