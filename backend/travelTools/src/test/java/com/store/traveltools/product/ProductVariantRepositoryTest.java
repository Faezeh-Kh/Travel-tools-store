package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

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

    private Product createTestProduct(String slug) {
        Category category = categoryRepository.findAll().getFirst();
        return productRepository.save(new Product(category, "Test Product " + slug, slug,
                "Short description.", "Full description.", List.of(), Map.of(), true));
    }

    @Test
    void singleOptionProduct_hasExactlyOneDefaultVariant() {
        Product product = createTestProduct("test-single-option-product");
        productVariantRepository.save(
                new ProductVariant(product, "TEST-SINGLE-SKU", Map.of(), new BigDecimal("100.00"), 10, true));

        List<ProductVariant> variants = productVariantRepository
                .findByProductIdAndActiveTrueOrderByIdAsc(product.getId());

        assertThat(variants).hasSize(1);
        assertThat(variants.get(0).getAttributes()).isEmpty();
    }

    @Test
    void multiOptionProduct_hasOneVariantPerOption() {
        Product product = createTestProduct("test-multi-option-product");
        productVariantRepository.save(new ProductVariant(
                product, "TEST-MULTI-SKU-A", Map.of("رنگ", "قرمز"), new BigDecimal("100.00"), 10, true));
        productVariantRepository.save(new ProductVariant(
                product, "TEST-MULTI-SKU-B", Map.of("رنگ", "آبی"), new BigDecimal("100.00"), 5, true));

        List<ProductVariant> variants = productVariantRepository
                .findByProductIdAndActiveTrueOrderByIdAsc(product.getId());

        assertThat(variants).hasSize(2);
        assertThat(variants).extracting(ProductVariant::getSku)
                .containsExactlyInAnyOrder("TEST-MULTI-SKU-A", "TEST-MULTI-SKU-B");
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

        Map<Long, ProductVariantRepository.ActivePriceRange> priceRangesByProductId = productVariantRepository
                .findActivePriceRanges().stream()
                .collect(Collectors.toMap(ProductVariantRepository.ActivePriceRange::getProductId, range -> range));

        assertThat(priceRangesByProductId.get(samePriceProduct.getId()).getMinPrice())
                .isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(priceRangesByProductId.get(samePriceProduct.getId()).getMaxPrice())
                .isEqualByComparingTo(new BigDecimal("100.00"));

        assertThat(priceRangesByProductId.get(differingPriceProduct.getId()).getMinPrice())
                .isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(priceRangesByProductId.get(differingPriceProduct.getId()).getMaxPrice())
                .isEqualByComparingTo(new BigDecimal("150.00"));
    }
}
