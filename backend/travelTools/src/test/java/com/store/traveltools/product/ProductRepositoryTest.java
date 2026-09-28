package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.store.traveltools.AbstractIntegrationTest;
import com.store.traveltools.category.Category;
import com.store.traveltools.category.CategoryRepository;
import com.store.traveltools.product.ProductRepository.ProductCatalogRow;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Category testCategory;
    private Category otherCategory;

    @BeforeEach
    void createTestCategories() {
        // Repository tests must not depend on Flyway seed data (PROJECT.md "Testing conventions"). Category's
        // fixture constructor is package-private to `category`, so minimal rows are inserted directly here
        // rather than widening its visibility just for this cross-package test's convenience.
        testCategory = categoryRepository.getReferenceById(insertCategory("test-category-for-product-repository-test"));
        otherCategory = categoryRepository.getReferenceById(insertCategory("test-other-category-for-product-repository-test"));
    }

    private Long insertCategory(String slug) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO categories (name, slug, description, active) VALUES (?, ?, ?, TRUE) RETURNING id",
                Long.class, "Test Category " + slug, slug, "Fixture.");
    }

    private Product createProduct(Category category, String name, String slug) {
        return productRepository.saveAndFlush(new Product(category, name, slug,
                "Short description of " + name + ".", "Full description of " + name + ".", List.of(), Map.of(),
                true));
    }

    private ProductVariant createVariant(Product product, String sku, BigDecimal price, int stock, boolean active) {
        return productVariantRepository.saveAndFlush(
                new ProductVariant(product, sku, Map.of(), price, stock, active));
    }

    private Page<ProductCatalogRow> search(String search, String category, boolean inStockOnly, ProductSort sort) {
        String sortName = sort == null ? null : sort.name();
        return productRepository.search(search, category, inStockOnly, sortName, PageRequest.of(0, 20));
    }

    @Test
    void search_excludesInactiveProducts() {
        Product active = createProduct(testCategory, "Test Active Product", "test-active-product-search");
        createVariant(active, "TEST-ACTIVE-SEARCH", new BigDecimal("100.00"), 5, true);
        Product inactive = productRepository.saveAndFlush(new Product(testCategory, "Test Inactive Product",
                "test-inactive-product-search", "Short.", "Full.", List.of(), Map.of(), false));

        Page<ProductCatalogRow> result = search(null, null, false, null);

        assertThat(result.getContent()).extracting(ProductCatalogRow::getId)
                .contains(active.getId())
                .doesNotContain(inactive.getId());
    }

    @Test
    void search_matchesProductNameCaseInsensitivelyAndPartially() {
        Product matchByName = createProduct(testCategory, "Mountaineering Tent Deluxe", "test-match-by-name");
        createVariant(matchByName, "TEST-MATCH-NAME", new BigDecimal("100.00"), 5, true);
        // Description deliberately does not contain "tent", so only the name can cause a match here.
        Product noMatch = productRepository.saveAndFlush(new Product(testCategory, "Folding Chair",
                "test-no-match-by-name", "A compact folding chair.", "Lightweight and easy to carry.",
                List.of(), Map.of(), true));
        createVariant(noMatch, "TEST-NO-MATCH-NAME", new BigDecimal("100.00"), 5, true);

        // Uppercase search term against a mixed-case name proves case-insensitivity, not just partial match.
        Page<ProductCatalogRow> result = search("TENT", null, false, null);

        assertThat(result.getContent()).extracting(ProductCatalogRow::getId)
                .contains(matchByName.getId())
                .doesNotContain(noMatch.getId());
    }

    @Test
    void search_matchesProductDescriptionCaseInsensitivelyAndPartially() {
        // Name deliberately does not contain "tent", so only the description can cause a match here.
        Product matchByDescription = productRepository.saveAndFlush(new Product(testCategory, "Folding Chair",
                "test-match-by-description", "A compact folding chair.",
                "Great for pitching next to your tent at the campsite.", List.of(), Map.of(), true));
        createVariant(matchByDescription, "TEST-MATCH-DESC", new BigDecimal("100.00"), 5, true);
        Product noMatch = productRepository.saveAndFlush(new Product(testCategory, "Cooking Pot",
                "test-no-match-by-description", "A sturdy cooking pot.", "Made of stainless steel.",
                List.of(), Map.of(), true));
        createVariant(noMatch, "TEST-NO-MATCH-DESC", new BigDecimal("100.00"), 5, true);

        Page<ProductCatalogRow> result = search("TENT", null, false, null);

        assertThat(result.getContent()).extracting(ProductCatalogRow::getId)
                .contains(matchByDescription.getId())
                .doesNotContain(noMatch.getId());
    }

    @Test
    void search_returnsNullPriceAndIsExcludedByInStockFilterWhenProductHasNoActiveVariants() {
        Product noActiveVariants = createProduct(testCategory, "Test Product No Active Variants", "test-no-active-variants");
        // Only an inactive variant exists, so the LEFT JOIN to active variants produces no matching rows.
        createVariant(noActiveVariants, "TEST-NO-ACTIVE-VARIANTS", new BigDecimal("100.00"), 5, false);

        ProductCatalogRow row = search(null, null, false, null).getContent().stream()
                .filter(r -> r.getId().equals(noActiveVariants.getId()))
                .findFirst().orElseThrow();
        assertThat(row.getMinPrice()).isNull();
        assertThat(row.getMaxPrice()).isNull();

        Page<ProductCatalogRow> withInStockFilter = search(null, null, true, null);
        assertThat(withInStockFilter.getContent()).extracting(ProductCatalogRow::getId)
                .doesNotContain(noActiveVariants.getId());
    }

    @Test
    void search_filtersByCategorySlug() {
        Product inTestCategory = createProduct(testCategory, "Test Category Product", "test-category-filter-a");
        createVariant(inTestCategory, "TEST-CAT-A", new BigDecimal("100.00"), 5, true);
        Product inOtherCategory = createProduct(otherCategory, "Other Category Product", "test-category-filter-b");
        createVariant(inOtherCategory, "TEST-CAT-B", new BigDecimal("100.00"), 5, true);

        Page<ProductCatalogRow> result = search(null, testCategory.getSlug(), false, null);

        assertThat(result.getContent()).extracting(ProductCatalogRow::getId)
                .contains(inTestCategory.getId())
                .doesNotContain(inOtherCategory.getId());
    }

    @Test
    void search_inStockOnlyExcludesProductsWhoseActiveVariantsAreAllOutOfStock() {
        Product outOfStock = createProduct(testCategory, "Test Out Of Stock Product", "test-out-of-stock");
        createVariant(outOfStock, "TEST-OOS", new BigDecimal("100.00"), 0, true);
        Product inStock = createProduct(testCategory, "Test In Stock Product", "test-in-stock");
        createVariant(inStock, "TEST-IN-STOCK", new BigDecimal("100.00"), 3, true);

        Page<ProductCatalogRow> withFilter = search(null, null, true, null);
        Page<ProductCatalogRow> withoutFilter = search(null, null, false, null);

        assertThat(withFilter.getContent()).extracting(ProductCatalogRow::getId)
                .contains(inStock.getId())
                .doesNotContain(outOfStock.getId());
        // Without the filter, the out-of-stock product still appears (matches today's existing
        // "active variants regardless of stock" price/listing behavior).
        assertThat(withoutFilter.getContent()).extracting(ProductCatalogRow::getId)
                .contains(inStock.getId(), outOfStock.getId());
    }

    @Test
    void search_priceFieldsReflectMinAndMaxAcrossActiveVariantsOnly() {
        Product product = createProduct(testCategory, "Test Price Range Product", "test-price-range-search");
        // Out of stock, but active: "active variants count regardless of stock" is a deliberate rule (matches
        // pre-existing catalog behavior), not an oversight - stock=0 here on purpose.
        createVariant(product, "TEST-PRICE-LOW", new BigDecimal("50.00"), 0, true);
        createVariant(product, "TEST-PRICE-HIGH", new BigDecimal("150.00"), 5, true);
        createVariant(product, "TEST-PRICE-INACTIVE", new BigDecimal("9999.00"), 5, false);

        ProductCatalogRow row = search(null, null, false, null).getContent().stream()
                .filter(r -> r.getId().equals(product.getId()))
                .findFirst().orElseThrow();

        assertThat(row.getMinPrice()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(row.getMaxPrice()).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    void search_sortsByMinimumActiveVariantPriceAscending() {
        // multiVariant's cheapest active variant (50) is out of stock; its priciest (300) is in stock. If
        // sorting used MAX instead of MIN, or excluded out-of-stock variants from the sort price, multiVariant
        // would sort as if its price were 300+ instead of 50 - this data specifically distinguishes that.
        Product multiVariant = createProduct(testCategory, "Test Multi Variant Product Asc", "test-sort-multi-asc");
        createVariant(multiVariant, "TEST-SORT-MULTI-ASC-LOW", new BigDecimal("50.00"), 0, true);
        createVariant(multiVariant, "TEST-SORT-MULTI-ASC-HIGH", new BigDecimal("300.00"), 5, true);
        Product single = createProduct(testCategory, "Test Single Variant Product Asc", "test-sort-single-asc");
        createVariant(single, "TEST-SORT-SINGLE-ASC", new BigDecimal("100.00"), 5, true);

        List<Long> order = search(null, null, false, ProductSort.PRICE_ASC).getContent().stream()
                .map(ProductCatalogRow::getId).toList();

        // multiVariant's minimum (50) is below single's only price (100), so it must sort first - this would
        // fail if sorting were driven by MAX (300) instead of MIN, or if the out-of-stock variant were ignored.
        assertThat(order.indexOf(multiVariant.getId())).isLessThan(order.indexOf(single.getId()));
    }

    @Test
    void search_sortsByMinimumActiveVariantPriceDescending() {
        // Mirrors the ascending case above: multiVariant's minimum (50) still drives descending order too,
        // so it must sort AFTER single (100) - proving descending also uses MIN, not MAX, per product.
        Product multiVariant = createProduct(testCategory, "Test Multi Variant Product Desc", "test-sort-multi-desc");
        createVariant(multiVariant, "TEST-SORT-MULTI-DESC-LOW", new BigDecimal("50.00"), 0, true);
        createVariant(multiVariant, "TEST-SORT-MULTI-DESC-HIGH", new BigDecimal("300.00"), 5, true);
        Product single = createProduct(testCategory, "Test Single Variant Product Desc", "test-sort-single-desc");
        createVariant(single, "TEST-SORT-SINGLE-DESC", new BigDecimal("100.00"), 5, true);

        List<Long> order = search(null, null, false, ProductSort.PRICE_DESC).getContent().stream()
                .map(ProductCatalogRow::getId).toList();

        assertThat(order.indexOf(single.getId())).isLessThan(order.indexOf(multiVariant.getId()));
    }

    @Test
    void search_sortsByNewestUsingCreationOrder() {
        Product older = createProduct(testCategory, "Test Older Product", "test-sort-older");
        createVariant(older, "TEST-SORT-OLDER", new BigDecimal("100.00"), 5, true);
        Product newer = createProduct(testCategory, "Test Newer Product", "test-sort-newer");
        createVariant(newer, "TEST-SORT-NEWER", new BigDecimal("100.00"), 5, true);

        List<Long> order = search(null, null, false, ProductSort.NEWEST).getContent().stream()
                .map(ProductCatalogRow::getId).toList();

        assertThat(order.indexOf(newer.getId())).isLessThan(order.indexOf(older.getId()));
    }

    @Test
    void search_defaultsToNameAscendingWhenSortUnspecified() {
        // Inserted in reverse alphabetical order so this actually proves sorting happens, rather than
        // passing merely because insertion order happened to match.
        Product second = createProduct(testCategory, "Test Sort Default B", "test-sort-default-b");
        createVariant(second, "TEST-SORT-DEFAULT-B", new BigDecimal("100.00"), 5, true);
        Product first = createProduct(testCategory, "Test Sort Default A", "test-sort-default-a");
        createVariant(first, "TEST-SORT-DEFAULT-A", new BigDecimal("100.00"), 5, true);

        List<Long> ids = search(null, null, false, null).getContent().stream()
                .map(ProductCatalogRow::getId)
                .filter(id -> id.equals(first.getId()) || id.equals(second.getId()))
                .toList();

        assertThat(ids).containsExactly(first.getId(), second.getId());
    }

    @Test
    void search_paginatesUsingPageableAndReportsCorrectTotals() {
        for (int i = 0; i < 3; i++) {
            Product product = createProduct(testCategory, "Test Page Product " + i, "test-page-product-" + i);
            createVariant(product, "TEST-PAGE-" + i, new BigDecimal("100.00"), 5, true);
        }

        Page<ProductCatalogRow> firstPage = productRepository.search(
                null, testCategory.getSlug(), false, null, PageRequest.of(0, 2));
        Page<ProductCatalogRow> secondPage = productRepository.search(
                null, testCategory.getSlug(), false, null, PageRequest.of(1, 2));

        assertThat(firstPage.getContent()).hasSize(2);
        assertThat(firstPage.getTotalElements()).isEqualTo(3);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
        assertThat(secondPage.getContent()).hasSize(1);
    }

    @Test
    void findBySlugAndActiveTrue_returnsProductWithItsCategory() {
        Product product = productRepository.save(new Product(testCategory, "Test Product With Category",
                "test-product-with-category", "Short description.", "Full description.", List.of(), Map.of(), true));

        Optional<Product> found = productRepository.findBySlugAndActiveTrue("test-product-with-category");

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(product.getId());
        assertThat(found.get().getCategory().getId()).isEqualTo(testCategory.getId());
    }

    @Test
    void findBySlugAndActiveTrue_returnsEmptyForUnknownSlug() {
        Optional<Product> product = productRepository.findBySlugAndActiveTrue("does-not-exist");

        assertThat(product).isEmpty();
    }

    @Test
    void findBySlugAndActiveTrue_returnsEmptyForExistingButInactiveProduct() {
        productRepository.save(new Product(testCategory, "Test Inactive Product For Slug",
                "test-inactive-product-for-slug", "Short description.", "Full description.", List.of(), Map.of(),
                false));

        Optional<Product> found = productRepository.findBySlugAndActiveTrue("test-inactive-product-for-slug");

        assertThat(found).isEmpty();
    }

    @Test
    void savingProductWithDuplicateSlug_violatesUniqueConstraint() {
        productRepository.saveAndFlush(new Product(testCategory, "Test Product A", "test-duplicate-product-slug",
                "Short description.", "Full description.", List.of(), Map.of(), true));

        assertThatThrownBy(() -> productRepository.saveAndFlush(new Product(testCategory, "Test Product B",
                "test-duplicate-product-slug", "Short description.", "Full description.", List.of(), Map.of(),
                true)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
