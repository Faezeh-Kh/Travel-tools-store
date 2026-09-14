CREATE TABLE products (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id       BIGINT NOT NULL REFERENCES categories (id),
    name              VARCHAR(200) NOT NULL,
    slug              VARCHAR(220) NOT NULL,
    short_description VARCHAR(300) NOT NULL,
    description       TEXT NOT NULL,
    images            JSONB NOT NULL DEFAULT '[]'::jsonb,
    specifications    JSONB NOT NULL DEFAULT '{}'::jsonb,
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_products_slug UNIQUE (slug)
);

CREATE INDEX idx_products_category_id ON products (category_id);

CREATE TABLE product_variants (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id     BIGINT NOT NULL REFERENCES products (id),
    sku            VARCHAR(64) NOT NULL,
    attributes     JSONB NOT NULL DEFAULT '{}'::jsonb,
    price          NUMERIC(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_product_variants_sku UNIQUE (sku),
    CONSTRAINT chk_product_variants_price_non_negative CHECK (price >= 0),
    CONSTRAINT chk_product_variants_stock_non_negative CHECK (stock_quantity >= 0)
);

CREATE INDEX idx_product_variants_product_id ON product_variants (product_id);

-- Seed sample products: one per category, three with a single default variant
-- (no options) and two with multiple variants (color / capacity) to exercise
-- both shapes of the "products without options have one default variant" rule.

INSERT INTO products (category_id, name, slug, short_description, description, images, specifications, active)
VALUES
    ((SELECT id FROM categories WHERE slug = 'camping-shelter'),
     'چادر کوهنوردی ۳ نفره',
     'tent-3-person-mountaineering',
     'چادر سبک و ضدآب مناسب برای کوهنوردی و کمپینگ سه نفره.',
     'چادر کوهنوردی ۳ نفره با پارچه ضدآب و دوخت‌های عایق‌بندی‌شده، مناسب برای سفرهای چندروزه در طبیعت. نصب آسان و وزن سبک از ویژگی‌های اصلی این چادر است.',
     '["/images/products/tent-3-person-mountaineering/1.jpg"]'::jsonb,
     '{"ظرفیت": "۳ نفر", "وزن": "۲.۱ کیلوگرم", "جنس": "نایلون ضدآب"}'::jsonb,
     TRUE),
    ((SELECT id FROM categories WHERE slug = 'camping-furniture'),
     'صندلی تاشو کمپینگ',
     'folding-camping-chair',
     'صندلی سبک و تاشو برای استراحت راحت در اردوگاه.',
     'صندلی تاشوی کمپینگ با قاب آلومینیومی سبک و پارچه تنفس‌پذیر، به‌همراه کیف حمل مناسب برای جابه‌جایی آسان.',
     '["/images/products/folding-camping-chair/1.jpg"]'::jsonb,
     '{"وزن": "۱.۲ کیلوگرم", "حداکثر وزن قابل تحمل": "۱۲۰ کیلوگرم", "جنس قاب": "آلومینیوم"}'::jsonb,
     TRUE),
    ((SELECT id FROM categories WHERE slug = 'cooking-food'),
     'اجاق گاز پرتابل کمپینگ',
     'portable-camping-gas-stove',
     'اجاق گاز کوچک و پرتابل برای پخت‌وپز در طبیعت.',
     'اجاق گاز پرتابل با مصرف بهینه سوخت و بدنه مقاوم، مناسب برای پخت‌وپز سریع در سفرهای کمپینگ.',
     '["/images/products/portable-camping-gas-stove/1.jpg"]'::jsonb,
     '{"وزن": "۳۵۰ گرم", "نوع سوخت": "کپسول گازی", "زمان جوش آوردن یک لیتر آب": "۴ دقیقه"}'::jsonb,
     TRUE),
    ((SELECT id FROM categories WHERE slug = 'lighting-power'),
     'چراغ‌قوه شارژی LED',
     'rechargeable-led-flashlight',
     'چراغ‌قوه شارژی با نور LED قوی و باتری قابل تعویض.',
     'چراغ‌قوه شارژی با نور LED پرقدرت، بدنه ضدضربه و ضدآب، مناسب برای استفاده در شب‌های کمپینگ.',
     '["/images/products/rechargeable-led-flashlight/1.jpg"]'::jsonb,
     '{"نوع نور": "LED"}'::jsonb,
     TRUE),
    ((SELECT id FROM categories WHERE slug = 'travel-accessories'),
     'کوله پشتی سفر ۴۰ لیتری',
     'travel-backpack-40l',
     'کوله پشتی سفر با ظرفیت ۴۰ لیتر و طراحی ارگونومیک.',
     'کوله پشتی سفر ۴۰ لیتری با چند محفظه جداگانه و بند‌های شانه‌ای قابل تنظیم، مناسب برای سفرهای چندروزه.',
     '["/images/products/travel-backpack-40l/1.jpg"]'::jsonb,
     '{"ظرفیت": "۴۰ لیتر", "وزن": "۱.۵ کیلوگرم", "جنس": "پلی‌استر ضدآب"}'::jsonb,
     TRUE);

INSERT INTO product_variants (product_id, sku, attributes, price, stock_quantity, active)
VALUES
    ((SELECT id FROM products WHERE slug = 'tent-3-person-mountaineering'),
     'TENT-3P-GRN', '{"رنگ": "سبز"}'::jsonb, 4850000.00, 12, TRUE),
    ((SELECT id FROM products WHERE slug = 'tent-3-person-mountaineering'),
     'TENT-3P-ORG', '{"رنگ": "نارنجی"}'::jsonb, 4850000.00, 8, TRUE),

    ((SELECT id FROM products WHERE slug = 'folding-camping-chair'),
     'CHAIR-FOLD-STD', '{}'::jsonb, 950000.00, 25, TRUE),

    ((SELECT id FROM products WHERE slug = 'portable-camping-gas-stove'),
     'STOVE-PORT-STD', '{}'::jsonb, 1250000.00, 18, TRUE),

    ((SELECT id FROM products WHERE slug = 'rechargeable-led-flashlight'),
     'FLASH-LED-1200', '{"ظرفیت باتری": "۱۲۰۰ میلی‌آمپرساعت"}'::jsonb, 780000.00, 20, TRUE),
    ((SELECT id FROM products WHERE slug = 'rechargeable-led-flashlight'),
     'FLASH-LED-2600', '{"ظرفیت باتری": "۲۶۰۰ میلی‌آمپرساعت"}'::jsonb, 1050000.00, 15, TRUE),

    ((SELECT id FROM products WHERE slug = 'travel-backpack-40l'),
     'BACKPACK-40L-STD', '{}'::jsonb, 2100000.00, 10, TRUE);
