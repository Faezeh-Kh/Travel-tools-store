package com.store.traveltools.order.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.store.traveltools.order.OrderStatus;

public record OrderResponse(
        String orderNumber,
        OrderStatus status,
        String firstName,
        String lastName,
        String phoneNumber,
        String address,
        String city,
        String postalCode,
        String notes,
        List<OrderItemResponse> items,
        BigDecimal totalPrice,
        Instant createdAt) {
}
