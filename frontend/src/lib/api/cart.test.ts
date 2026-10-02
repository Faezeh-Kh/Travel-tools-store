import {afterEach, describe, expect, it, vi} from "vitest";
import type {Cart} from "./types";
import {addCartItem, CartError, getCart, removeCartItem, updateCartItemQuantity} from "./cart";

const sampleCart: Cart = {
    id: "11111111-1111-1111-1111-111111111111",
    items: [
        {
            id: 1,
            productVariantId: 10,
            productName: "چادر کوهنوردی ۳ نفره",
            productSlug: "tent-3-person-mountaineering",
            primaryImage: null,
            sku: "TENT-3P-GRN",
            attributes: {"رنگ": "سبز"},
            unitPrice: 4850000,
            quantity: 2,
            totalPrice: 9700000,
            stockQuantity: 12,
        },
    ],
    subtotal: 9700000,
    totalPrice: 9700000,
};

function mockFetchOnce(response: Partial<Response>) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => sampleCart,
        ...response,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("getCart", () => {
    it("requests the cart endpoint with credentials and returns the parsed cart", async () => {
        const fetchMock = mockFetchOnce({});

        const result = await getCart();

        expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/cart", {credentials: "include"});
        expect(result).toEqual(sampleCart);
    });

    it("throws a CartError with the backend's code and message on failure", async () => {
        mockFetchOnce({
            ok: false,
            status: 409,
            json: async () => ({code: "CONFLICT", message: "Only 3 unit(s) of TENT-3P-GRN are available."}),
        });

        // Captured once: this is a single real fetch, not two separate calls to assert on separately.
        const error = await getCart().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(CartError);
        expect(error).toMatchObject({
            code: "CONFLICT",
            message: "Only 3 unit(s) of TENT-3P-GRN are available.",
        });
    });

    it("falls back to a generic error when the failure response has no JSON body", async () => {
        mockFetchOnce({
            ok: false,
            status: 500,
            json: async () => {
                throw new Error("not json");
            },
        });

        const error = await getCart().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(CartError);
        expect(error).toMatchObject({code: "UNKNOWN", message: "Cart request failed: 500"});
    });
});

describe("addCartItem", () => {
    it("posts the variant id and quantity with credentials", async () => {
        const fetchMock = mockFetchOnce({});

        const result = await addCartItem(10, 2);

        expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/cart/items", {
            method: "POST",
            credentials: "include",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({productVariantId: 10, quantity: 2}),
        });
        expect(result).toEqual(sampleCart);
    });
});

describe("updateCartItemQuantity", () => {
    it("patches the item's quantity with credentials", async () => {
        const fetchMock = mockFetchOnce({});

        const result = await updateCartItemQuantity(1, 5);

        expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/cart/items/1", {
            method: "PATCH",
            credentials: "include",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({quantity: 5}),
        });
        expect(result).toEqual(sampleCart);
    });
});

describe("removeCartItem", () => {
    it("deletes the item with credentials", async () => {
        const fetchMock = mockFetchOnce({});

        const result = await removeCartItem(1);

        expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/cart/items/1", {
            method: "DELETE",
            credentials: "include",
        });
        expect(result).toEqual(sampleCart);
    });
});
