package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import com.store.traveltools.AbstractIntegrationTest;
import com.store.traveltools.category.Category;
import com.store.traveltools.category.CategoryRepository;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductVariantRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Category testCategory;

    @BeforeEach
    void createTestCategory() {
        // See ProductRepositoryTest for why this is a raw insert rather than a Category fixture constructor call.
        Long categoryId = jdbcTemplate.queryForObject(
                "INSERT INTO categories (name, slug, description, active) VALUES (?, ?, ?, TRUE) RETURNING id",
                Long.class, "Test Category", "test-category-for-variant-repository-test", "Fixture.");
        testCategory = categoryRepository.getReferenceById(categoryId);
    }

    private Product createTestProduct(String slug) {
        return productRepository.save(new Product(testCategory, "Test Product " + slug, slug,
                "Short description.", "Full description.", List.of(), Map.of(), true));
    }

    @Test
    void findByProductIdAndActiveTrueOrderByIdAsc_excludesInactiveVariantsAndOrdersByInsertionOrder() {
        Product product = createTestProduct("test-active-inactive-variants");
        ProductVariant first = productVariantRepository.save(
                new ProductVariant(product, "TEST-FIRST", Map.of(), new BigDecimal("100.00"), 10, true));
        ProductVariant inactive = productVariantRepository.save(
                new ProductVariant(product, "TEST-INACTIVE", Map.of(), new BigDecimal("100.00"), 10, false));
        ProductVariant second = productVariantRepository.save(
                new ProductVariant(product, "TEST-SECOND", Map.of(), new BigDecimal("100.00"), 10, true));

        List<ProductVariant> variants = productVariantRepository
                .findByProductIdAndActiveTrueOrderByIdAsc(product.getId());

        assertThat(variants).extracting(ProductVariant::getId)
                .containsExactly(first.getId(), second.getId())
                .doesNotContain(inactive.getId());
    }

    @Test
    void findActivePriceRanges_reflectsEqualAndDifferingVariantPrices() {
        Product samePriceProduct = createTestProduct("test-same-price-product");
        productVariantRepository.save(
                new ProductVariant(samePriceProduct, "TEST-SAME-A", Map.of(), new BigDecimal("100.00"), 10, true));
        productVariantRepository.save(
                new ProductVariant(samePriceProduct, "TEST-SAME-B", Map.of(), new BigDecimal("100.00"), 5, true));

        Product differingPriceProduct = createTestProduct("test-differing-price-product");
        productVariantRepository.save(new ProductVariant(
                differingPriceProduct, "TEST-DIFF-A", Map.of(), new BigDecimal("50.00"), 10, true));
        productVariantRepository.save(new ProductVariant(
                differingPriceProduct, "TEST-DIFF-B", Map.of(), new BigDecimal("150.00"), 5, true));

        Map<Long, ProductVariantRepository.ActivePriceRange> priceRangesByProductId = findActivePriceRangesByProductId();

        assertThat(priceRangesByProductId.get(samePriceProduct.getId()).getMinPrice())
                .isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(priceRangesByProductId.get(samePriceProduct.getId()).getMaxPrice())
                .isEqualByComparingTo(new BigDecimal("100.00"));

        assertThat(priceRangesByProductId.get(differingPriceProduct.getId()).getMinPrice())
                .isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(priceRangesByProductId.get(differingPriceProduct.getId()).getMaxPrice())
                .isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    void findActivePriceRanges_excludesInactiveVariantsFromRange() {
        Product product = createTestProduct("test-price-range-excludes-inactive");
        productVariantRepository.save(
                new ProductVariant(product, "TEST-ACTIVE-LOW", Map.of(), new BigDecimal("50.00"), 10, true));
        productVariantRepository.save(
                new ProductVariant(product, "TEST-ACTIVE-HIGH", Map.of(), new BigDecimal("150.00"), 5, true));
        productVariantRepository.save(new ProductVariant(
                product, "TEST-INACTIVE-EXTREME", Map.of(), new BigDecimal("9999.00"), 1, false));

        Map<Long, ProductVariantRepository.ActivePriceRange> priceRangesByProductId = findActivePriceRangesByProductId();

        assertThat(priceRangesByProductId.get(product.getId()).getMinPrice())
                .isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(priceRangesByProductId.get(product.getId()).getMaxPrice())
                .isEqualByComparingTo(new BigDecimal("150.00"));
    }

    private Map<Long, ProductVariantRepository.ActivePriceRange> findActivePriceRangesByProductId() {
        return productVariantRepository.findActivePriceRanges().stream()
                .collect(Collectors.toMap(ProductVariantRepository.ActivePriceRange::getProductId, range -> range));
    }

    @Test
    void savingVariantWithDuplicateSku_violatesUniqueConstraint() {
        Product product = createTestProduct("test-duplicate-sku-product");
        productVariantRepository.saveAndFlush(
                new ProductVariant(product, "TEST-DUPLICATE-SKU", Map.of(), new BigDecimal("100.00"), 10, true));

        assertThatThrownBy(() -> productVariantRepository.saveAndFlush(
                new ProductVariant(product, "TEST-DUPLICATE-SKU", Map.of(), new BigDecimal("100.00"), 5, true)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void savingVariantWithNegativePrice_violatesCheckConstraint() {
        Product product = createTestProduct("test-negative-price-product");

        assertThatThrownBy(() -> productVariantRepository.saveAndFlush(
                new ProductVariant(product, "TEST-NEGATIVE-PRICE", Map.of(), new BigDecimal("-1.00"), 10, true)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void savingVariantWithNegativeStock_violatesCheckConstraint() {
        Product product = createTestProduct("test-negative-stock-product");

        assertThatThrownBy(() -> productVariantRepository.saveAndFlush(
                new ProductVariant(product, "TEST-NEGATIVE-STOCK", Map.of(), new BigDecimal("100.00"), -1, true)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
