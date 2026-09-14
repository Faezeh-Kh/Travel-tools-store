package com.store.traveltools.product;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    List<ProductVariant> findByProductIdAndActiveTrueOrderByIdAsc(Long productId);

    @Query("""
            select v.product.id as productId, min(v.price) as minPrice, max(v.price) as maxPrice
            from ProductVariant v
            where v.active = true
            group by v.product.id
            """)
    List<ActivePriceRange> findActivePriceRanges();

    interface ActivePriceRange {

        Long getProductId();

        BigDecimal getMinPrice();

        BigDecimal getMaxPrice();
    }
}
