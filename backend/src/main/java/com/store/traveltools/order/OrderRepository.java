package com.store.traveltools.order;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.Repository;

// Extends the bare Repository marker instead of JpaRepository so that only the operations declared here
// exist. In particular there are no delete methods: orders are never deleted (they are cancelled), and
// the absence of any delete operation is how the application enforces that.
public interface OrderRepository extends Repository<Order, Long> {

    Order save(Order order);

    // The entity graph loads the items in the same query as the order (a join), instead of one extra
    // lazy query when the items are first read.
    @EntityGraph(attributePaths = "items")
    Optional<Order> findByOrderNumber(String orderNumber);

    // The customer-facing lookup: only the random access token may expose an order's details publicly.
    @EntityGraph(attributePaths = "items")
    Optional<Order> findByAccessToken(UUID accessToken);
}
