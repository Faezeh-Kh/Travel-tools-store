"""Generate the dev-only catalog seed migration from the product sheet (CSV UTF-8 export).

Usage (from the repository root):
    python scripts/seed/generate_catalog_seed.py path/to/products_seed.csv

Each sheet row is one product variant. Rows sharing a slug form one product: their name, category,
short description and specification keys must match, and specification keys whose values differ
between the rows become the variants' attributes (e.g. two power banks differing only in capacity).
A single-row product gets one default variant with no attributes.

Product images are discovered, not listed in the sheet: frontend/public/images/products/ holds files
named after a variant's SKU, either <SKU>.jpg for a single photo or <SKU>.1.jpg, <SKU>.2.jpg, ... for
several. A product shows the photos of all its variants, in sheet order and then by number.

The output is an idempotent Flyway repeatable migration (upserts keyed on slug/SKU). Products and
variants missing from the sheet are deactivated rather than deleted, because cart items reference
variants. Only the Python standard library is used.
"""

import csv
import json
import re
import sys
from collections import OrderedDict
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_FILE = REPO_ROOT / "backend/travelTools/src/main/resources/db/seed/R__dev_catalog_seed.sql"
PRODUCT_IMAGES_DIR = REPO_ROOT / "frontend/public/images/products"
CATEGORY_IMAGES_DIR = REPO_ROOT / "frontend/public/images/categories"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Mirrors the categories created in V1. Sheet values are matched after normalization (see
# category_key), so "پخت و پز و غذا" and "پخت‌وپز و غذا" both resolve to cooking-food.
CATEGORIES = {
    "کمپینگ و سرپناه": ("camping-shelter", "shelter_category.webp"),
    "مبلمان کمپینگ": ("camping-furniture", "furniture_category.webp"),
    "پخت‌وپز و غذا": ("cooking-food", "cooking_category.webp"),
    "روشنایی و برق": ("lighting-power", "lighting_category.webp"),
    "لوازم جانبی سفر": ("travel-accessories", "accessories_category.webp"),
}

# Sheet header (after trimming spaces and the required-field "*") -> internal field name.
COLUMNS = {
    "نام محصول": "name",
    "Slug": "slug",
    "SKU": "sku",
    "دسته‌بندی": "category",
    "توصیف کوتاه": "short_description",
    "مشخصات": "specifications",
    "قیمت واحد": "price",
    "تعداد موجودی": "stock",
}

# Column limits from V1/V2.
MAX_NAME = 200
MAX_SLUG = 220
MAX_SHORT_DESCRIPTION = 300
MAX_SKU = 64
MAX_PRICE = Decimal("99999999.99")  # NUMERIC(10, 2)

SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SKU_PATTERN = re.compile(r"^[A-Z0-9]+(?:-[A-Z0-9]+)*$")
EDGE_INVISIBLES = "‌‍‎‏﻿"
PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
VALUE_SEPARATOR = re.compile(r"[,،]")
# Plain digits, or thousands grouped by one consistent separator ("," or Persian "٬"), then an optional
# "." fraction. Anything else (e.g. the decimal comma in "1,5") is rejected rather than guessed at.
PRICE_PATTERN = re.compile(r"^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:٬\d{3})+)(?:\.\d+)?$")


class SeedError(Exception):
    """Raised with every problem found in the sheet, so they can all be fixed in one pass."""

    def __init__(self, problems):
        super().__init__("\n".join(problems))
        self.problems = problems


@dataclass
class Row:
    line: int
    name: str
    slug: str
    sku: str
    category_slug: str
    short_description: str
    specifications: dict
    price: Decimal
    stock: int


@dataclass
class Variant:
    sku: str
    attributes: dict
    price: Decimal
    stock: int


@dataclass
class Product:
    slug: str
    name: str
    category_slug: str
    short_description: str
    specifications: dict
    variants: list
    images: list


def clean(text):
    """Collapse whitespace and drop invisible joiner/direction marks at the edges."""
    return re.sub(r"\s+", " ", text or "").strip().strip(EDGE_INVISIBLES).strip()


def category_key(text):
    """Comparison key that ignores spaces and ZWNJs, so "پخت و پز" matches "پخت‌وپز"."""
    return re.sub(r"[\s‌]", "", text or "")


CATEGORY_BY_KEY = {category_key(name): slug for name, (slug, _) in CATEGORIES.items()}


def parse_specifications(text):
    """Parse "name: value; name: v1، v2;" into an ordered dict; multiple values are joined with "، "."""
    specifications = OrderedDict()
    for segment in (text or "").split(";"):
        if not clean(segment):
            continue
        if ":" not in segment:
            raise ValueError(f'specification "{clean(segment)}" has no ":" between name and value')
        raw_name, raw_value = segment.split(":", 1)
        name = clean(raw_name)
        values = [
            cleaned
            for value in VALUE_SEPARATOR.split(raw_value)
            if (cleaned := clean(value))
        ]
        if not name or not values:
            raise ValueError(f'specification "{clean(segment)}" needs both a name and a value')
        if name in specifications:
            raise ValueError(f'specification "{name}" appears more than once')
        specifications[name] = "، ".join(values)
    return specifications


def parse_price(text):
    normalized = clean(text).translate(PERSIAN_DIGITS)
    if not normalized:
        raise ValueError("price is required")
    if not PRICE_PATTERN.match(normalized):
        raise ValueError(f'price "{clean(text)}" is not a number like 1500000 or 1,500,000.00')
    try:
        price = Decimal(normalized.replace(",", "").replace("٬", ""))
    except InvalidOperation:
        raise ValueError(f'price "{clean(text)}" is not a number') from None
    # Ordering comparisons on NaN raise InvalidOperation, which would escape the per-row problem report.
    if not price.is_finite() or price <= 0 or price > MAX_PRICE or price.as_tuple().exponent < -2:
        raise ValueError(f"price {price} must be positive, at most {MAX_PRICE}, with at most 2 decimals")
    return price.quantize(Decimal("0.01"))


def parse_stock(text):
    normalized = clean(text).translate(PERSIAN_DIGITS)
    if not normalized:
        return 0
    if not normalized.isdigit():
        raise ValueError(f'stock "{clean(text)}" must be a whole number of 0 or more')
    return int(normalized)


def read_rows(csv_path):
    with open(csv_path, encoding="utf-8-sig", newline="") as file:
        reader = csv.reader(file)
        # Headers are compared without spaces, ZWNJs or the required-field "*", which Excel users add freely.
        header = [category_key(cell).strip(EDGE_INVISIBLES).rstrip("*") for cell in next(reader, [])]
        expected = {category_key(column): column for column in COLUMNS}
        missing = [column for key, column in expected.items() if key not in header]
        if missing:
            raise SeedError([f"missing column(s): {', '.join(missing)}"])
        index = {COLUMNS[column]: header.index(key) for key, column in expected.items()}

        rows, problems = [], []
        for cells in reader:
            if not any(clean(cell) for cell in cells):
                continue
            cells = cells + [""] * (len(header) - len(cells))
            raw = {field: cells[position] for field, position in index.items()}
            try:
                rows.append(parse_row(reader.line_num, raw))
            except ValueError as error:
                problems.append(f"row {reader.line_num}: {error}")
        if problems:
            raise SeedError(problems)
        return rows


def parse_row(line, raw):
    name, slug, sku = clean(raw["name"]), clean(raw["slug"]), clean(raw["sku"])
    short_description = clean(raw["short_description"])
    if not name or len(name) > MAX_NAME:
        raise ValueError(f"name is required and at most {MAX_NAME} characters")
    if not SLUG_PATTERN.match(slug) or len(slug) > MAX_SLUG:
        raise ValueError(f'slug "{slug}" must be lowercase kebab-case (a-z, 0-9, -), at most {MAX_SLUG} characters')
    if not SKU_PATTERN.match(sku) or len(sku) > MAX_SKU:
        raise ValueError(f'SKU "{sku}" must be uppercase (A-Z, 0-9, -), at most {MAX_SKU} characters')
    category_slug = CATEGORY_BY_KEY.get(category_key(raw["category"]))
    if category_slug is None:
        raise ValueError(f'unknown category "{clean(raw["category"])}"; expected one of: {", ".join(CATEGORIES)}')
    if not short_description or len(short_description) > MAX_SHORT_DESCRIPTION:
        raise ValueError(f"short description is required and at most {MAX_SHORT_DESCRIPTION} characters")
    return Row(line, name, slug, sku, category_slug, short_description,
               parse_specifications(raw["specifications"]), parse_price(raw["price"]), parse_stock(raw["stock"]))


def build_products(rows, images_dir=PRODUCT_IMAGES_DIR):
    # An empty catalog would render invalid SQL (empty VALUES / NOT IN ()) and deactivate everything.
    if not rows:
        raise SeedError(["the sheet has no product rows"])
    groups = OrderedDict()
    for row in rows:
        groups.setdefault(row.slug, []).append(row)

    problems = []
    seen_skus, seen_names = {}, {}
    for row in rows:
        if row.sku in seen_skus:
            problems.append(f"row {row.line}: SKU {row.sku} is already used in row {seen_skus[row.sku]}")
        seen_skus.setdefault(row.sku, row.line)

    products = []
    for slug, group in groups.items():
        first = group[0]
        lines = ", ".join(str(row.line) for row in group)
        if first.name in seen_names:
            problems.append(f"rows {lines}: name \"{first.name}\" is already used by slug {seen_names[first.name]}")
        seen_names.setdefault(first.name, slug)
        for field, label in (("name", "name"), ("category_slug", "category"),
                             ("short_description", "short description")):
            if len({getattr(row, field) for row in group}) > 1:
                values = "; ".join(f'row {row.line}: "{getattr(row, field)}"' for row in group)
                problems.append(f"slug {slug}: rows {lines} must share the same {label} ({values})")
        # Names are compared as sets; the output keeps the first row's order.
        if len({frozenset(row.specifications) for row in group}) > 1:
            problems.append(f"slug {slug}: rows {lines} must list the same specification names")
            continue

        # Keys with one value across all rows describe the product; keys that differ tell the variants apart.
        shared, varying = OrderedDict(), []
        for key in first.specifications:
            values = {row.specifications[key] for row in group}
            if len(values) == 1:
                shared[key] = first.specifications[key]
            else:
                varying.append(key)
        variants = [Variant(row.sku, {key: row.specifications[key] for key in varying}, row.price, row.stock)
                    for row in group]
        if len(group) > 1 and len({json.dumps(v.attributes, ensure_ascii=False) for v in variants}) < len(group):
            problems.append(f"slug {slug}: rows {lines} are identical in every specification, "
                            "so the variants can't be told apart")
        products.append(Product(slug, first.name, first.category_slug, first.short_description, shared,
                                variants, find_images(images_dir, [row.sku for row in group])))

    if problems:
        raise SeedError(problems)
    return products


def find_images(images_dir, skus):
    """Image paths for the given SKUs: <SKU>.<ext> or <SKU>.<n>.<ext>, ordered by SKU, then n."""
    folder = Path(images_dir)
    files = [path for path in folder.iterdir()
             if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS] if folder.is_dir() else []
    images = []
    for sku in skus:
        # SKUs never contain ".", so the stem is either exactly the SKU or the SKU plus ".<number>".
        pattern = re.compile(re.escape(sku) + r"(?:\.(\d+))?")
        matches = [(int(match.group(1) or 0), path.name)
                   for path in files if (match := pattern.fullmatch(path.stem))]
        images.extend(f"/images/products/{name}" for _, name in sorted(matches))
    return images


def unused_images(images_dir, products):
    """Image files no product picked up, usually a typo in the SKU part of the file name."""
    folder = Path(images_dir)
    if not folder.is_dir():
        return []
    used = {path.rsplit("/", 1)[1] for product in products for path in product.images}
    return sorted(path.name for path in folder.iterdir()
                  if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS and path.name not in used)


def sql_text(value):
    return "'" + value.replace("'", "''") + "'"


def sql_json(value):
    return sql_text(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def render_sql(products, category_images_dir=CATEGORY_IMAGES_DIR):
    lines = [
        "-- GENERATED by scripts/seed/generate_catalog_seed.py from the product sheet. Do not edit by hand:",
        "-- change the sheet and regenerate. Dev-only: this folder is on the Flyway path only in the dev profile.",
        "-- Repeatable migration: Flyway re-runs it whenever its content changes, so every statement is an upsert.",
        "",
    ]

    for name, (slug, image) in CATEGORIES.items():
        if (Path(category_images_dir) / image).is_file():
            lines.append(f"UPDATE categories SET image_url = {sql_text('/images/categories/' + image)} "
                         f"WHERE slug = {sql_text(slug)};")
    lines.append("")

    lines.append("INSERT INTO products (category_id, name, slug, short_description, description, images, "
                 "specifications, active)")
    lines.append("VALUES")
    product_values = []
    for product in products:
        # No long description in the sheet yet; the short one stands in until real copy exists.
        product_values.append(
            f"    ((SELECT id FROM categories WHERE slug = {sql_text(product.category_slug)}),\n"
            f"     {sql_text(product.name)},\n"
            f"     {sql_text(product.slug)},\n"
            f"     {sql_text(product.short_description)},\n"
            f"     {sql_text(product.short_description)},\n"
            f"     {sql_json(product.images)},\n"
            f"     {sql_json(product.specifications)},\n"
            f"     TRUE)")
    lines.append(",\n".join(product_values))
    lines.append("ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, name = EXCLUDED.name,")
    lines.append("    short_description = EXCLUDED.short_description, description = EXCLUDED.description,")
    lines.append("    images = EXCLUDED.images, specifications = EXCLUDED.specifications, active = TRUE, "
                 "updated_at = now();")
    lines.append("")

    lines.append("INSERT INTO product_variants (product_id, sku, attributes, price, stock_quantity, active)")
    lines.append("VALUES")
    variant_values = []
    for product in products:
        for variant in product.variants:
            variant_values.append(
                f"    ((SELECT id FROM products WHERE slug = {sql_text(product.slug)}), {sql_text(variant.sku)}, "
                f"{sql_json(variant.attributes)}, {variant.price}, {variant.stock}, TRUE)")
    lines.append(",\n".join(variant_values))
    lines.append("ON CONFLICT (sku) DO UPDATE SET product_id = EXCLUDED.product_id, attributes = EXCLUDED.attributes,")
    lines.append("    price = EXCLUDED.price, stock_quantity = EXCLUDED.stock_quantity, active = TRUE, "
                 "updated_at = now();")
    lines.append("")

    skus = ", ".join(sql_text(variant.sku) for product in products for variant in product.variants)
    slugs = ", ".join(sql_text(product.slug) for product in products)
    lines.append("-- Anything no longer in the sheet (including the V2 sample products) is deactivated, not deleted:")
    lines.append("-- cart items may still reference those variants.")
    lines.append(
        f"UPDATE product_variants SET active = FALSE, updated_at = now() WHERE active AND sku NOT IN ({skus});")
    lines.append(f"UPDATE products SET active = FALSE, updated_at = now() WHERE active AND slug NOT IN ({slugs});")
    return "\n".join(lines) + "\n"


def main(argv):
    # Windows consoles default to a legacy code page that can't print Persian sheet values.
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    if len(argv) != 2:
        print("usage: python scripts/seed/generate_catalog_seed.py path/to/products_seed.csv", file=sys.stderr)
        return 2
    try:
        products = build_products(read_rows(argv[1]))
    except SeedError as error:
        print("The sheet has problems; nothing was generated:", file=sys.stderr)
        for problem in error.problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(render_sql(products), encoding="utf-8", newline="\n")
    variant_count = sum(len(product.variants) for product in products)
    without_images = [product.slug for product in products if not product.images]
    print(f"Wrote {len(products)} products / {variant_count} variants to {OUTPUT_FILE.relative_to(REPO_ROOT)}")
    if without_images:
        print(f"No images found for: {', '.join(without_images)}")
    unused = unused_images(PRODUCT_IMAGES_DIR, products)
    if unused:
        print(f"Images matching no SKU (not used): {', '.join(unused)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
