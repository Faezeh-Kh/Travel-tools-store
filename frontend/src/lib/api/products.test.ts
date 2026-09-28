import {afterEach, describe, expect, it, vi} from "vitest";
import type {PageResponse, ProductDetail, ProductSummary} from "./types";

const {notFound} = vi.hoisted(() => ({
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));

vi.mock("next/navigation", () => ({notFound}));

import {getProducts, getProductBySlug} from "./products";

const sampleProducts: ProductSummary[] = [
    {
        id: 1,
        name: "چادر کوهنوردی ۳ نفره",
        slug: "tent-3-person-mountaineering",
        shortDescription: "توضیحات",
        primaryImage: null,
        minPrice: 4850000,
        maxPrice: 4850000,
    },
];

const sampleProductsPage: PageResponse<ProductSummary> = {
    items: sampleProducts,
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
};

const sampleProductDetail: ProductDetail = {
    id: 1,
    name: "چادر کوهنوردی ۳ نفره",
    slug: "tent-3-person-mountaineering",
    shortDescription: "توضیحات",
    description: "توضیحات کامل",
    images: [],
    specifications: {},
    categoryName: "کمپینگ و سرپناه",
    categorySlug: "camping-shelter",
    variants: [],
};

function mockFetchOnce(response: Partial<Response>) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
        ...response,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
    notFound.mockClear();
});

describe("getProducts", () => {
    it("requests the products endpoint with no query string and returns the parsed page", async () => {
        const fetchMock = mockFetchOnce({ok: true, status: 200, json: async () => sampleProductsPage});

        const result = await getProducts();

        expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/products");
        expect(result).toEqual(sampleProductsPage);
    });

    it("builds a query string from the supplied search params", async () => {
        const fetchMock = mockFetchOnce({ok: true, status: 200, json: async () => sampleProductsPage});

        await getProducts({search: "چادر", category: "camping-shelter", inStock: true, sort: "price-asc", page: 1, size: 10});

        expect(fetchMock).toHaveBeenCalledWith(
            "http://localhost:8080/api/products?search=%DA%86%D8%A7%D8%AF%D8%B1&category=camping-shelter&inStock=true&sort=price-asc&page=1&size=10",
        );
    });

    it("throws when the response is not ok", async () => {
        mockFetchOnce({ok: false, status: 500});

        await expect(getProducts()).rejects.toThrow("Failed to fetch products: 500");
    });
});

describe("getProductBySlug", () => {
    it("requests the product endpoint and returns the parsed detail", async () => {
        const fetchMock = mockFetchOnce({ok: true, status: 200, json: async () => sampleProductDetail});

        const result = await getProductBySlug("tent-3-person-mountaineering");

        expect(fetchMock).toHaveBeenCalledWith(
            "http://localhost:8080/api/products/tent-3-person-mountaineering",
        );
        expect(result).toEqual(sampleProductDetail);
    });

    it("calls notFound() when the backend returns 404", async () => {
        mockFetchOnce({ok: false, status: 404});

        await expect(getProductBySlug("does-not-exist")).rejects.toThrow();
        expect(notFound).toHaveBeenCalledOnce();
    });

    it("throws a generic error for other non-ok statuses, without calling notFound()", async () => {
        mockFetchOnce({ok: false, status: 500});

        await expect(getProductBySlug("tent-3-person-mountaineering")).rejects.toThrow(
            'Failed to fetch product "tent-3-person-mountaineering": 500',
        );
        expect(notFound).not.toHaveBeenCalled();
    });
});
