import {describe, expect, it} from "vitest";
import {formatPrice, formatPriceRange} from "./format";

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
