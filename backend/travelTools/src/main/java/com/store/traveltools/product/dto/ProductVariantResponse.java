package com.store.traveltools.product.dto;

import java.math.BigDecimal;
import java.util.Map;

public record ProductVariantResponse(
        Long id,
        String sku,
        Map<String, String> attributes,
        BigDecimal price,
        Integer stockQuantity) {
}
