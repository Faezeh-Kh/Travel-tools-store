package com.store.traveltools.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Assigned by the database (column default from order_number_seq, see V6). @Generated makes
    // Hibernate leave the column out of the INSERT and read the generated value back afterwards.
    @Generated
    @Column(name = "order_number", nullable = false, unique = true, insertable = false, updatable = false)
    private String orderNumber;

    // Also assigned by the database (gen_random_uuid(), see V6). Unlike the guessable order number, this is
    // what grants access to the order's details, so it is only ever handed to the customer who placed it.
    @Generated
    @Column(name = "access_token", nullable = false, unique = true, insertable = false, updatable = false)
    private UUID accessToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "phone_number", nullable = false)
    private String phoneNumber;

    @Embedded
    private DeliveryAddress deliveryAddress;

    private String notes;

    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;

    // The order owns its items: they are saved together with it (cascade PERSIST), so there is no
    // separate OrderItem repository. Items are only ever added, at checkout - there is no removal or
    // update path - which is what keeps totalPrice equal to the sum of the item totals.
    @OneToMany(mappedBy = "order", cascade = CascadeType.PERSIST)
    @OrderBy("id")
    private List<OrderItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Order() {
    }

    // Package-private: orders are only created by checkout (in this package).
    Order(String firstName, String lastName, String phoneNumber, DeliveryAddress deliveryAddress, String notes) {
        this.status = OrderStatus.PENDING;
        this.firstName = Objects.requireNonNull(firstName, "firstName");
        this.lastName = Objects.requireNonNull(lastName, "lastName");
        this.phoneNumber = Objects.requireNonNull(phoneNumber, "phoneNumber");
        this.deliveryAddress = Objects.requireNonNull(deliveryAddress, "deliveryAddress");
        this.notes = notes;
        this.totalPrice = BigDecimal.ZERO;
    }

    // Keeps both sides of the relationship and the order total consistent: the total is always the sum
    // of the item totals, never set independently.
    void addItem(OrderItem item) {
        item.setOrder(this);
        items.add(item);
        totalPrice = totalPrice.add(item.getTotalPrice());
    }

    public Long getId() {
        return id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public UUID getAccessToken() {
        return accessToken;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public DeliveryAddress getDeliveryAddress() {
        return deliveryAddress;
    }

    public String getNotes() {
        return notes;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
