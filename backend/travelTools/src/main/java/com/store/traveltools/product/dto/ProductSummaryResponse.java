package com.store.traveltools.product.dto;

import java.math.BigDecimal;

public record ProductSummaryResponse(
        Long id,
        String name,
        String slug,
        String shortDescription,
        String primaryImage,
        BigDecimal minPrice,
        BigDecimal maxPrice) {
}
