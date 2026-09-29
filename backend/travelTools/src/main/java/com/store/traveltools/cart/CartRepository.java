package com.store.traveltools.cart;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface CartRepository extends JpaRepository<Cart, UUID> {

    // SELECT ... FOR UPDATE: acquires the row lock synchronously, the moment this query runs (unlike
    // optimistic locking, there's no deferred/flush-dependent step to reason about). A concurrent call
    // to this same method for the same cart, from another transaction, blocks here until this
    // transaction commits or rolls back - see CartService.lockCartForMutation/requireCart for why every
    // CartItem mutation is funneled through this instead of a plain findById.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Cart c where c.id = :id")
    Optional<Cart> lockById(UUID id);
}
