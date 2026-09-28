import {describe, expect, it} from "vitest";
import {parseProductSearchParams} from "./parseProductSearchParams";

describe("parseProductSearchParams", () => {
    it("passes through search, category and a recognized sort value", () => {
        const result = parseProductSearchParams({search: "چادر", category: "camping-shelter", sort: "price-asc"});

        expect(result).toEqual({search: "چادر", category: "camping-shelter", sort: "price-asc"});
    });

    it("drops an unrecognized sort value instead of forwarding it to the backend", () => {
        const result = parseProductSearchParams({sort: "not-a-real-sort"});

        expect(result.sort).toBeUndefined();
    });

    it("coerces inStock to true only for the literal string \"true\"", () => {
        expect(parseProductSearchParams({inStock: "true"})).toEqual({inStock: true});
        expect(parseProductSearchParams({inStock: "yes"})).toEqual({});
        expect(parseProductSearchParams({})).toEqual({});
    });

    it("parses a valid non-negative integer page and drops an invalid one", () => {
        expect(parseProductSearchParams({page: "2"})).toEqual({page: 2});
        expect(parseProductSearchParams({page: "-1"})).toEqual({});
        expect(parseProductSearchParams({page: "not-a-number"})).toEqual({});
    });

    it("takes the first value when a query key is repeated", () => {
        const result = parseProductSearchParams({search: ["چادر", "کوله"], sort: ["price-asc", "newest"]});

        expect(result).toEqual({search: "چادر", sort: "price-asc"});
    });

    it("returns an empty object for no query params", () => {
        expect(parseProductSearchParams({})).toEqual({});
    });
});
