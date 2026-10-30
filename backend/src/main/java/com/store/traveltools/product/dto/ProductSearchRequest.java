package com.store.traveltools.product.dto;

import com.store.traveltools.product.ProductSort;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record ProductSearchRequest(
        @Size(max = 200) String search,
        String category,
        Boolean inStock,
        ProductSort sort,
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size) {

    // inStock/page/size use boxed types (not primitives) specifically so a completely absent query
    // param binds to null here rather than tripping Spring's @ModelAttribute record binding, which
    // otherwise treats a missing primitive constructor parameter as a required-but-missing value.
    public ProductSearchRequest {
        if (inStock == null) {
            inStock = false;
        }
        if (page == null) {
            page = 0;
        }
        if (size == null) {
            size = 20;
        }
    }
}
