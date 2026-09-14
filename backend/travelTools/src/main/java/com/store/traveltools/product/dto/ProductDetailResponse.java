package com.store.traveltools.product.dto;

import java.util.List;
import java.util.Map;

public record ProductDetailResponse(
        Long id,
        String name,
        String slug,
        String shortDescription,
        String description,
        List<String> images,
        Map<String, String> specifications,
        String categoryName,
        String categorySlug,
        List<ProductVariantResponse> variants) {
}
