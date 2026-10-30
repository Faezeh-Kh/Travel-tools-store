package com.store.traveltools.product;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    List<ProductVariant> findByProductIdAndActiveTrueOrderByIdAsc(Long productId);

    Optional<ProductVariant> findByIdAndActiveTrue(Long id);

    // SELECT ... FOR UPDATE on every requested variant, used by checkout so that two checkouts touching
    // the same variant are serialized and the second one reads the stock the first one left behind.
    // Ordering by id makes every transaction acquire overlapping locks in the same order, which is what
    // prevents two checkouts from deadlocking on each other.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from ProductVariant v where v.id in :ids order by v.id")
    List<ProductVariant> lockAllByIdOrderById(Collection<Long> ids);
}
