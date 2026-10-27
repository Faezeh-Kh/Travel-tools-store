package com.store.traveltools.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class OrderTest {

    private static Order newOrder() {
        return new Order("First", "Last", "09120000000", new DeliveryAddress("Address", "City", "1234567890"), null);
    }

    private static OrderItem newItem(Integer quantity, BigDecimal unitPrice) {
        return new OrderItem(1L, 1L, "Name", "", null, "SKU", quantity, unitPrice);
    }

    @Test
    void newOrder_isPendingWithZeroTotalAndNoItems() {
        Order order = newOrder();

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.getTotalPrice()).isEqualByComparingTo("0");
        assertThat(order.getItems()).isEmpty();
    }

    @Test
    void orderItem_totalIsUnitPriceTimesQuantity() {
        assertThat(newItem(3, new BigDecimal("1250.50")).getTotalPrice()).isEqualByComparingTo("3751.50");
    }

    @Test
    void orderItem_allowsAZeroUnitPrice() {
        assertThat(newItem(1, BigDecimal.ZERO).getTotalPrice()).isEqualByComparingTo("0");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1})
    void orderItem_rejectsNonPositiveQuantity(int quantity) {
        assertThatThrownBy(() -> newItem(quantity, new BigDecimal("100.00")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void orderItem_rejectsMissingQuantity() {
        assertThatThrownBy(() -> newItem(null, new BigDecimal("100.00")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void orderItem_rejectsNegativeOrMissingUnitPrice() {
        assertThatThrownBy(() -> newItem(1, new BigDecimal("-0.01"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> newItem(1, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void orderItem_rejectsMissingRequiredSnapshotFields() {
        BigDecimal price = new BigDecimal("100.00");

        assertThatThrownBy(() -> new OrderItem(null, 1L, "Name", "", null, "SKU", 1, price))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new OrderItem(1L, null, "Name", "", null, "SKU", 1, price))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new OrderItem(1L, 1L, null, "", null, "SKU", 1, price))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new OrderItem(1L, 1L, "Name", null, null, "SKU", 1, price))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new OrderItem(1L, 1L, "Name", "", null, null, 1, price))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void order_rejectsMissingContactOrAddressFields() {
        DeliveryAddress address = new DeliveryAddress("Address", "City", "1234567890");

        assertThatThrownBy(() -> new Order(null, "Last", "0912", address, null))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new Order("First", null, "0912", address, null))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new Order("First", "Last", null, address, null))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new Order("First", "Last", "0912", null, null))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new DeliveryAddress(null, "City", "1234567890"))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new DeliveryAddress("Address", null, "1234567890"))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new DeliveryAddress("Address", "City", null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void addItem_linksTheItemAndAddsItsTotalToTheOrderTotal() {
        Order order = newOrder();
        OrderItem first = newItem(2, new BigDecimal("100.00"));
        OrderItem second = newItem(1, new BigDecimal("49.99"));

        order.addItem(first);
        order.addItem(second);

        assertThat(order.getItems()).containsExactly(first, second);
        assertThat(first.getOrder()).isSameAs(order);
        assertThat(order.getTotalPrice()).isEqualByComparingTo("249.99");
    }
}
