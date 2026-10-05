// Prices from the API are already in Toman (see PROJECT.md), so they are only labelled, never converted.
export function formatPrice(value: number): string {
    return `${value.toLocaleString("fa-IR")} تومان`;
}

export function formatPriceRange(minPrice: number | null, maxPrice: number | null): string {
    if (minPrice === null || maxPrice === null) {
        return "ناموجود";
    }

    if (minPrice === maxPrice) {
        return formatPrice(minPrice);
    }

    return `${minPrice.toLocaleString("fa-IR")} تا ${formatPrice(maxPrice)}`;
}
