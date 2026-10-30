package com.store.traveltools.order.dto;

import java.math.BigDecimal;

public record OrderItemResponse(
        String productName,
        String variantDescription,
        String productImage,
        String sku,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice) {
}
