package com.store.traveltools.order;

import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

// An @Embeddable has no table or id of its own: its fields are stored as columns of the owning
// entity's table (orders). It only groups the address fields into one value in Java.
@Embeddable
public class DeliveryAddress {

    @Column(name = "address", nullable = false)
    private String addressLine;

    @Column(nullable = false)
    private String city;

    @Column(name = "postal_code", nullable = false)
    private String postalCode;

    protected DeliveryAddress() {
    }

    public DeliveryAddress(String addressLine, String city, String postalCode) {
        this.addressLine = Objects.requireNonNull(addressLine, "addressLine");
        this.city = Objects.requireNonNull(city, "city");
        this.postalCode = Objects.requireNonNull(postalCode, "postalCode");
    }

    public String getAddressLine() {
        return addressLine;
    }

    public String getCity() {
        return city;
    }

    public String getPostalCode() {
        return postalCode;
    }
}
