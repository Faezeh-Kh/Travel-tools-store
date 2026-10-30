package com.store.traveltools.product;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

// Maps the public, URL-friendly query value (?sort=price-asc) to the enum. Keeps the API surface
// idiomatic rather than exposing Java enum-name casing (PRICE_ASC) in the query string.
@Component
public class ProductSortConverter implements Converter<String, ProductSort> {

    @Override
    public ProductSort convert(String source) {
        return switch (source) {
            case "newest" -> ProductSort.NEWEST;
            case "price-asc" -> ProductSort.PRICE_ASC;
            case "price-desc" -> ProductSort.PRICE_DESC;
            default -> throw new IllegalArgumentException("Unknown sort value: " + source);
        };
    }
}
