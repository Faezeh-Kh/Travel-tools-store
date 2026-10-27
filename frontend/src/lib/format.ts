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

// A moment from the API (an ISO-8601 instant) as Persian date and time, e.g. "۵ آبان ۱۴۰۵ ساعت ۱۳:۳۰". fa-IR uses
// the Solar Hijri calendar. The time zone is fixed to Iran's: the page is rendered on the server, whose own
// time zone must not decide what the shopper sees.
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
});

export function formatDateTime(isoInstant: string): string {
    return DATE_TIME_FORMAT.format(new Date(isoInstant));
}
