package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import com.store.traveltools.AbstractIntegrationTest;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductVariantRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Test
    void singleOptionProduct_hasExactlyOneDefaultVariant() {
        Long chairId = productRepository.findBySlugAndActiveTrue("folding-camping-chair").orElseThrow().getId();

        List<ProductVariant> variants = productVariantRepository.findByProductIdAndActiveTrueOrderByIdAsc(chairId);

        assertThat(variants).hasSize(1);
        assertThat(variants.get(0).getAttributes()).isEmpty();
    }

    @Test
    void multiOptionProduct_hasOneVariantPerOption() {
        Long tentId = productRepository.findBySlugAndActiveTrue("tent-3-person-mountaineering").orElseThrow().getId();

        List<ProductVariant> variants = productVariantRepository.findByProductIdAndActiveTrueOrderByIdAsc(tentId);

        assertThat(variants).hasSize(2);
        assertThat(variants).extracting(ProductVariant::getSku)
                .containsExactlyInAnyOrder("TENT-3P-GRN", "TENT-3P-ORG");
    }

    @Test
    void findActivePriceRanges_reflectsEqualAndDifferingVariantPrices() {
        Long tentId = productRepository.findBySlugAndActiveTrue("tent-3-person-mountaineering").orElseThrow().getId();
        Long flashlightId = productRepository.findBySlugAndActiveTrue("rechargeable-led-flashlight")
                .orElseThrow().getId();

        var priceRanges = productVariantRepository.findActivePriceRanges().stream()
                .collect(java.util.stream.Collectors.toMap(
                        ProductVariantRepository.ActivePriceRange::getProductId, r -> r));

        assertThat(priceRanges.get(tentId).getMinPrice()).isEqualByComparingTo(new BigDecimal("4850000.00"));
        assertThat(priceRanges.get(tentId).getMaxPrice()).isEqualByComparingTo(new BigDecimal("4850000.00"));

        assertThat(priceRanges.get(flashlightId).getMinPrice()).isEqualByComparingTo(new BigDecimal("780000.00"));
        assertThat(priceRanges.get(flashlightId).getMaxPrice()).isEqualByComparingTo(new BigDecimal("1050000.00"));
    }
}
