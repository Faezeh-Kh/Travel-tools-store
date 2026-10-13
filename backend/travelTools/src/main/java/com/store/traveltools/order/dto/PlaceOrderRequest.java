package com.store.traveltools.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Size limits match the V6 columns, so oversized input is a 400 rather than a database error.
public record PlaceOrderRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        // An Iranian mobile number: 09 followed by 9 digits.
        @NotBlank @Pattern(regexp = "09\\d{9}") String phoneNumber,
        @NotBlank @Size(max = 500) String address,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Pattern(regexp = "\\d{10}") String postalCode,
        @Size(max = 1000) String notes) {

    // Runs when Jackson builds the record from the request body, before Bean Validation checks it, so the
    // rules above see normalized input whichever client sent it: surrounding whitespace is removed, and the
    // phone number and postal code accept Persian/Arabic digits and the spaces or hyphens people type
    // between digit groups. (Java's \d only matches ASCII digits.)
    public PlaceOrderRequest {
        firstName = strip(firstName);
        lastName = strip(lastName);
        phoneNumber = normalizeDigits(phoneNumber);
        address = strip(address);
        city = strip(city);
        postalCode = normalizeDigits(postalCode);
        notes = strip(notes);
    }

    private static String strip(String value) {
        return value == null ? null : value.strip();
    }

    private static String normalizeDigits(String value) {
        if (value == null) {
            return null;
        }
        StringBuilder normalized = new StringBuilder(value.length());
        for (char c : value.toCharArray()) {
            if (Character.isDigit(c)) {
                // Character.digit understands every Unicode decimal digit, e.g. '۵' (Persian) -> 5.
                normalized.append((char) ('0' + Character.digit(c, 10)));
            } else if (!Character.isWhitespace(c) && c != '-') {
                normalized.append(c);
            }
        }
        return normalized.toString();
    }
}
