package com.store.traveltools.cart;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    // join fetch avoids N+1: building a CartResponse needs each item's variant (price/sku) and that
    // variant's product (name), which a plain findByCartId would otherwise lazy-load one query at a time.
    @Query("select ci from CartItem ci join fetch ci.productVariant v join fetch v.product where ci.cart.id = :cartId order by ci.id")
    List<CartItem> findByCartIdOrderByIdAsc(UUID cartId);

    // Ownership-scoped lookup: every item-level mutation must go through this (never a bare findById)
    // so one cart can never read or modify another cart's items via a guessed item id.
    Optional<CartItem> findByIdAndCartId(Long id, UUID cartId);

    Optional<CartItem> findByCartIdAndProductVariantId(UUID cartId, Long productVariantId);
}
