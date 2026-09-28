package com.store.traveltools.product;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    List<ProductVariant> findByProductIdAndActiveTrueOrderByIdAsc(Long productId);
}
