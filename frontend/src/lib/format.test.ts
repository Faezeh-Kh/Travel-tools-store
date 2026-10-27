import {describe, expect, it} from "vitest";
import {formatDateTime, formatPrice, formatPriceRange} from "./format";

describe("formatPrice", () => {
    it("formats a value using Persian digit grouping with a تومان suffix", () => {
        expect(formatPrice(4850000)).toBe("۴٬۸۵۰٬۰۰۰ تومان");
    });
});

describe("formatPriceRange", () => {
    it("returns 'ناموجود' when either price is null", () => {
        expect(formatPriceRange(null, 1000)).toBe("ناموجود");
        expect(formatPriceRange(1000, null)).toBe("ناموجود");
        expect(formatPriceRange(null, null)).toBe("ناموجود");
    });

    it("returns a single formatted price when min and max are equal", () => {
        expect(formatPriceRange(4850000, 4850000)).toBe("۴٬۸۵۰٬۰۰۰ تومان");
    });

    it("returns a compact range when min and max differ", () => {
        expect(formatPriceRange(780000, 1050000)).toBe("۷۸۰٬۰۰۰ تا ۱٬۰۵۰٬۰۰۰ تومان");
    });
});

describe("formatDateTime", () => {
    it("shows an instant as a Solar Hijri date and time in Iran's time zone", () => {
        // 10:00 UTC is 13:30 in Tehran (UTC+3:30, no daylight saving time).
        const formatted = formatDateTime("2026-10-27T10:00:00Z");

        expect(formatted).toContain("۵ آبان ۱۴۰۵");
        expect(formatted).toContain("۱۳:۳۰");
    });

    it("uses Iran's date, not UTC's, around midnight", () => {
        // 21:00 UTC on 27 October is already 00:30 on 28 October (6 Aban) in Tehran.
        expect(formatDateTime("2026-10-27T21:00:00Z")).toContain("۶ آبان ۱۴۰۵");
    });
});
