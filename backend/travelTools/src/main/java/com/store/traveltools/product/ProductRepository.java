package com.store.traveltools.product;

import java.math.BigDecimal;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findBySlugAndActiveTrue(String slug);

    // GROUP BY p.id alone is sufficient (not p.name/p.slug/... too): PostgreSQL detects that grouping
    // by a table's full primary key functionally determines every other column of that same table, so
    // selecting other p.* columns ungrouped is valid here - not an oversight.
    //
    // :sort is compared as plain text against a small, backend-controlled enum name (never a raw
    // client-supplied column), so this ORDER BY can't be used to inject arbitrary ordering. When :sort
    // matches none of the CASE WHEN branches (including a null-collated request, i.e. no filter), every
    // branch evaluates to NULL and ordering falls through to the final p.name tiebreaker.
    @Query(
            value = """
                    select p.id as id, p.name as name, p.slug as slug, p.short_description as shortDescription,
                           p.images ->> 0 as primaryImage,
                           min(v.price) as minPrice, max(v.price) as maxPrice
                    from products p
                    join categories c on c.id = p.category_id
                    left join product_variants v on v.product_id = p.id and v.active = true
                    where p.active = true
                      and (:search is null or p.name ilike concat('%', :search, '%')
                                            or p.description ilike concat('%', :search, '%'))
                      and (:category is null or c.slug = :category)
                    group by p.id
                    having (:inStockOnly = false or max(v.stock_quantity) > 0)
                    order by
                        case when :sort = 'PRICE_ASC' then min(v.price) end asc,
                        case when :sort = 'PRICE_DESC' then min(v.price) end desc,
                        case when :sort = 'NEWEST' then p.created_at end desc,
                        p.name asc
                    """,
            countQuery = """
                    select count(*) from (
                        select p.id
                        from products p
                        join categories c on c.id = p.category_id
                        left join product_variants v on v.product_id = p.id and v.active = true
                        where p.active = true
                          and (:search is null or p.name ilike concat('%', :search, '%')
                                                or p.description ilike concat('%', :search, '%'))
                          and (:category is null or c.slug = :category)
                        group by p.id
                        having (:inStockOnly = false or max(v.stock_quantity) > 0)
                    ) counted
                    """,
            nativeQuery = true)
    Page<ProductCatalogRow> search(
            @Param("search") String search,
            @Param("category") String category,
            @Param("inStockOnly") boolean inStockOnly,
            @Param("sort") String sort,
            Pageable pageable);

    interface ProductCatalogRow {

        Long getId();

        String getName();

        String getSlug();

        String getShortDescription();

        String getPrimaryImage();

        BigDecimal getMinPrice();

        BigDecimal getMaxPrice();
    }
}
