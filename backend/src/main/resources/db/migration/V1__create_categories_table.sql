CREATE TABLE categories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    slug        VARCHAR(120)  NOT NULL,
    description VARCHAR(500)  NOT NULL,
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_categories_name UNIQUE (name),
    CONSTRAINT uq_categories_slug UNIQUE (slug)
);

INSERT INTO categories (name, slug, description, active) VALUES
    ('کمپینگ و سرپناه', 'camping-shelter', 'چادر، زیرانداز و تجهیزات سرپناه برای اقامت در طبیعت.', TRUE),
    ('مبلمان کمپینگ', 'camping-furniture', 'صندلی، میز و مبلمان قابل‌حمل برای اردوگاه.', TRUE),
    ('پخت‌وپز و غذا', 'cooking-food', 'اجاق، ظروف پخت‌وپز و لوازم نگهداری غذا برای آشپزی در سفر.', TRUE),
    ('روشنایی و برق', 'lighting-power', 'چراغ‌قوه، فانوس و منابع تأمین برق قابل‌حمل.', TRUE),
    ('لوازم جانبی سفر', 'travel-accessories', 'کیف، کوله و لوازم جانبی برای سفر.', TRUE);
