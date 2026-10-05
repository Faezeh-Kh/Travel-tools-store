"""Tests for the catalog seed generator. Run from the repository root:
    python -m unittest discover scripts/seed
"""

import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from generate_catalog_seed import (SeedError, build_products, parse_price, parse_specifications, parse_stock,
                                   read_rows, render_sql, unused_images)

HEADER = "نام محصول *,Slug,SKU,دسته‌بندی ,توصیف کوتاه,مشخصات,قیمت واحد ,تعداد موجودی \n"


def row(name="چادر", slug="tent", sku="TNT-1", category="کمپینگ و سرپناه", short="چادر سبک",
        specs="رنگ: سبز;", price='"1,000,000.00"', stock="3"):
    return f"{name},{slug},{sku},{category},{short},\"{specs}\",{price},{stock}\n"


class SheetTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.images_dir = Path(self.temp_dir.name) / "images"

    def products(self, *rows):
        path = Path(self.temp_dir.name) / "sheet.csv"
        # utf-8-sig mirrors Excel's "CSV UTF-8" export, which starts with a BOM.
        path.write_text(HEADER + "".join(rows), encoding="utf-8-sig")
        return build_products(read_rows(path), self.images_dir)

    def assertProblem(self, fragment, *rows):
        with self.assertRaises(SeedError) as raised:
            self.products(*rows)
        self.assertTrue(any(fragment in problem for problem in raised.exception.problems),
                        raised.exception.problems)


class ParsingTest(unittest.TestCase):
    def test_specifications_split_features_and_join_multiple_values(self):
        specs = parse_specifications("رنگ: آبی، نارنجی, سبز; ابعاد: 50 * 70;  ;")
        self.assertEqual({"رنگ": "آبی، نارنجی، سبز", "ابعاد": "50 * 70"}, specs)

    def test_specification_value_keeps_colons_after_the_first(self):
        self.assertEqual({"ساعت": "10:30"}, parse_specifications("ساعت: 10:30"))

    def test_specification_name_ignores_trailing_zwnj(self):
        self.assertEqual({"پورت": "USB"}, parse_specifications("پورت‌: USB;"))

    def test_specification_without_colon_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "no \":\""):
            parse_specifications("رنگ سبز;")

    def test_duplicate_or_empty_specification_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "more than once"):
            parse_specifications("رنگ: سبز; رنگ: آبی")
        with self.assertRaisesRegex(ValueError, "both a name and a value"):
            parse_specifications("رنگ: ;")

    def test_price_accepts_separators_and_persian_digits(self):
        self.assertEqual(Decimal("4200000.00"), parse_price("4,200,000.00"))
        self.assertEqual(Decimal("1500.00"), parse_price("۱٬۵۰۰"))

    def test_price_boundaries(self):
        self.assertEqual(Decimal("99999999.99"), parse_price("99999999.99"))
        for invalid in ("", "0", "-5", "100000000", "1.005", "abc"):
            with self.subTest(price=invalid), self.assertRaises(ValueError):
                parse_price(invalid)

    def test_price_with_malformed_separators_is_rejected_instead_of_guessed(self):
        # "1,5" is a decimal comma (1.5), not 15; the others are misplaced or mixed group separators.
        for invalid in ("1,5", "1,50", "12,34,567", "1,000٬000", "1,000,", ",100", "1.000,50", "1.", "1e3"):
            with self.subTest(price=invalid), self.assertRaisesRegex(ValueError, "not a number"):
                parse_price(invalid)

    def test_non_finite_price_is_reported_as_a_value_error(self):
        for invalid in ("NaN", "sNaN", "Infinity", "-Infinity"):
            with self.subTest(price=invalid), self.assertRaises(ValueError):
                parse_price(invalid)

    def test_stock_defaults_to_zero_and_rejects_negative_or_fractional(self):
        self.assertEqual(0, parse_stock(""))
        self.assertEqual(12, parse_stock("۱۲"))
        for invalid in ("-1", "2.5"):
            with self.subTest(stock=invalid), self.assertRaises(ValueError):
                parse_stock(invalid)


class BuildProductsTest(SheetTestCase):
    def test_single_row_becomes_product_with_one_default_variant(self):
        [product] = self.products(row(), ",,,,,,,\n")
        self.assertEqual("camping-shelter", product.category_slug)
        self.assertEqual({"رنگ": "سبز"}, product.specifications)
        self.assertEqual(1, len(product.variants))
        self.assertEqual({}, product.variants[0].attributes)
        self.assertEqual(Decimal("1000000.00"), product.variants[0].price)

    def test_rows_sharing_a_slug_become_variants_split_on_differing_specifications(self):
        [product] = self.products(row(sku="PWB-30", specs="رنگ: سفید; ظرفیت: 30000;", price="10"),
                                  row(sku="PWB-50", specs="رنگ: سفید; ظرفیت: 50000;", price="20"))
        self.assertEqual({"رنگ": "سفید"}, product.specifications)
        self.assertEqual([("PWB-30", {"ظرفیت": "30000"}, Decimal("10.00")),
                          ("PWB-50", {"ظرفیت": "50000"}, Decimal("20.00"))],
                         [(v.sku, v.attributes, v.price) for v in product.variants])

    def test_category_matches_despite_spacing_and_zwnj_differences(self):
        [product] = self.products(row(category="پخت و پز و غذا"))
        self.assertEqual("cooking-food", product.category_slug)

    def test_unknown_category_is_rejected(self):
        self.assertProblem("unknown category", row(category="ورزشی"))

    def test_rows_of_one_product_must_share_name(self):
        # Excel renders both names identically in an RTL cell; only the stored word order differs.
        self.assertProblem("same name", row(name="kingkong پاوربانک", sku="A-1", specs="ظرفیت: 1"),
                           row(name="پاوربانک kingkong", sku="A-2", specs="ظرفیت: 2"))

    def test_variants_without_any_differing_specification_are_rejected(self):
        self.assertProblem("can't be told apart", row(sku="A-1"), row(sku="A-2"))

    def test_variants_must_list_the_same_specification_names(self):
        self.assertProblem("same specification names", row(sku="A-1", specs="رنگ: سبز"),
                           row(sku="A-2", specs="رنگ: آبی; وزن: 2"))

    def test_variants_may_list_the_same_specification_names_in_a_different_order(self):
        [product] = self.products(row(sku="PWB-30", specs="رنگ: سفید; ظرفیت: 30000; وزن: 1"),
                                  row(sku="PWB-50", specs="وزن: 1; ظرفیت: 50000; رنگ: سفید"))
        # The first row's order is kept for the output.
        self.assertEqual(["رنگ", "وزن"], list(product.specifications))
        self.assertEqual([{"ظرفیت": "30000"}, {"ظرفیت": "50000"}], [v.attributes for v in product.variants])

    def test_sheet_without_product_rows_is_rejected(self):
        self.assertProblem("no product rows", ",,,,,,,\n")

    def test_duplicate_sku_and_duplicate_name_across_products_are_rejected(self):
        self.assertProblem("already used in row", row(slug="a", sku="X-1"), row(name="دیگر", slug="b", sku="X-1"))
        self.assertProblem("already used by slug", row(slug="a", sku="X-1"), row(slug="b", sku="X-2"))

    def test_invalid_slug_and_sku_formats_are_rejected(self):
        self.assertProblem("kebab-case", row(slug="Tent 3"))
        self.assertProblem("uppercase", row(sku="tnt-1"))

    def test_all_row_problems_are_reported_together(self):
        with self.assertRaises(SeedError) as raised:
            self.products(row(price="0"), row(slug="b", sku="B-1", stock="-2"))
        self.assertEqual(2, len(raised.exception.problems))

    def test_missing_column_is_reported(self):
        path = Path(self.temp_dir.name) / "sheet.csv"
        path.write_text("نام محصول,Slug\n", encoding="utf-8-sig")
        with self.assertRaisesRegex(SeedError, "missing column"):
            read_rows(path)

    def test_images_are_matched_by_variant_sku_in_sheet_then_number_order(self):
        self.images_dir.mkdir()
        for name in ("PWB-50.jpg", "PWB-30.2.webp", "PWB-30.10.jpg", "PWB-30.1.jpg", "PWB-300.jpg", "PWB-30.txt"):
            (self.images_dir / name).write_bytes(b"")
        [product] = self.products(row(sku="PWB-30", specs="ظرفیت: 30000"), row(sku="PWB-50", specs="ظرفیت: 50000"))
        # PWB-300 is another SKU, not a numbered PWB-30 photo; .txt is not an image.
        self.assertEqual(["/images/products/PWB-30.1.jpg", "/images/products/PWB-30.2.webp",
                          "/images/products/PWB-30.10.jpg", "/images/products/PWB-50.jpg"], product.images)
        self.assertEqual(["PWB-300.jpg"], unused_images(self.images_dir, [product]))

    def test_product_without_matching_images_has_none(self):
        [product] = self.products(row())
        self.assertEqual([], product.images)


class RenderSqlTest(SheetTestCase):
    def test_sql_escapes_quotes_and_upserts_by_natural_keys(self):
        sql = render_sql(self.products(row(name="چادر O'Neil")), self.images_dir)
        self.assertIn("'چادر O''Neil'", sql)
        self.assertIn("ON CONFLICT (slug) DO UPDATE", sql)
        self.assertIn("ON CONFLICT (sku) DO UPDATE", sql)
        self.assertIn("1000000.00, 3, TRUE", sql)

    def test_sql_deactivates_everything_missing_from_the_sheet(self):
        sql = render_sql(self.products(row()), self.images_dir)
        self.assertIn("WHERE active AND sku NOT IN ('TNT-1');", sql)
        self.assertIn("WHERE active AND slug NOT IN ('tent');", sql)


if __name__ == "__main__":
    unittest.main()
