import {afterEach, describe, expect, it, vi} from "vitest";
import type {Category} from "./types";

const {notFound} = vi.hoisted(() => ({
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));

vi.mock("next/navigation", () => ({notFound}));

import {getCategories, getCategoryBySlug} from "./categories";

const sampleCategories: Category[] = [
    {id: 1, name: "کمپینگ و سرپناه", slug: "camping-shelter", description: "توضیحات", imageUrl: null},
    {id: 2, name: "روشنایی و برق", slug: "lighting-power", description: "توضیحات", imageUrl: null},
];

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

describe("getCategories", () => {
    it("requests the categories endpoint and returns the parsed list", async () => {
        const fetchMock = mockFetchOnce({ok: true, status: 200, json: async () => sampleCategories});

        const result = await getCategories();

        expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/categories");
        expect(result).toEqual(sampleCategories);
    });

    it("throws when the response is not ok", async () => {
        mockFetchOnce({ok: false, status: 500});

        await expect(getCategories()).rejects.toThrow("Failed to fetch categories: 500");
    });
});

describe("getCategoryBySlug", () => {
    it("returns the matching category from the list", async () => {
        mockFetchOnce({ok: true, status: 200, json: async () => sampleCategories});

        const result = await getCategoryBySlug("lighting-power");

        expect(result).toEqual(sampleCategories[1]);
    });

    it("calls notFound() when no category matches the slug", async () => {
        mockFetchOnce({ok: true, status: 200, json: async () => sampleCategories});

        await expect(getCategoryBySlug("does-not-exist")).rejects.toThrow();
        expect(notFound).toHaveBeenCalledOnce();
    });
});
