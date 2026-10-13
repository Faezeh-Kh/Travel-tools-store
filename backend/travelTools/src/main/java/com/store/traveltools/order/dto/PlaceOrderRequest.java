package com.store.traveltools.order.dto;

// Validation annotations (required fields, phone/postal-code formats, lengths) are added together with
// the checkout endpoint, where they are enforced and tested as part of the HTTP contract.
public record PlaceOrderRequest(
        String firstName,
        String lastName,
        String phoneNumber,
        String address,
        String city,
        String postalCode,
        String notes) {
}
