package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ProductVariantTest {

    private static ProductVariant variantWithStock(int stock) {
        return new ProductVariant(null, "SKU-1", Map.of(), new BigDecimal("100.00"), stock, true);
    }

    @Test
    void decreaseStock_subtractsTheQuantity() {
        ProductVariant variant = variantWithStock(10);

        variant.decreaseStock(3);

        assertThat(variant.getStockQuantity()).isEqualTo(7);
    }

    @Test
    void decreaseStock_canTakeTheLastUnits() {
        ProductVariant variant = variantWithStock(3);

        variant.decreaseStock(3);

        assertThat(variant.getStockQuantity()).isZero();
    }

    @Test
    void decreaseStock_refusesToGoBelowZero() {
        ProductVariant variant = variantWithStock(2);

        assertThatThrownBy(() -> variant.decreaseStock(3)).isInstanceOf(IllegalArgumentException.class);
        assertThat(variant.getStockQuantity()).isEqualTo(2);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1})
    void decreaseStock_rejectsNonPositiveQuantity(int quantity) {
        ProductVariant variant = variantWithStock(5);

        assertThatThrownBy(() -> variant.decreaseStock(quantity)).isInstanceOf(IllegalArgumentException.class);
        assertThat(variant.getStockQuantity()).isEqualTo(5);
    }
}
