package com.store.traveltools.order.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.store.traveltools.order.OrderStatus;

// accessToken is included so the client that placed the order can build its confirmation link
// (GET /api/orders/{accessToken}); anyone able to read this response already holds it.
public record OrderResponse(
        String orderNumber,
        UUID accessToken,
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
