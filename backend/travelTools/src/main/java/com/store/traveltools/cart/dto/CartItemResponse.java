package com.store.traveltools.cart.dto;

import java.math.BigDecimal;
import java.util.Map;

public record CartItemResponse(
        Long id,
        Long productVariantId,
        String productName,
        String sku,
        Map<String, String> attributes,
        BigDecimal unitPrice,
        Integer quantity,
        BigDecimal totalPrice) {
}
