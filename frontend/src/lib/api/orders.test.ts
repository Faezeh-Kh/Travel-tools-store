import {afterEach, describe, expect, it, vi} from "vitest";
import type {Order, PlaceOrderRequest} from "./types";

const {notFound} = vi.hoisted(() => ({
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));

vi.mock("next/navigation", () => ({notFound}));

import {getOrder, OrderError, placeOrder} from "./orders";

const sampleRequest: PlaceOrderRequest = {
    firstName: "سارا",
    lastName: "محمدی",
    phoneNumber: "09121234567",
    address: "خیابان آزادی، پلاک ۱۰",
    city: "تهران",
    postalCode: "1234567890",
    notes: "",
};

const sampleOrder: Order = {
    orderNumber: "TT-100001",
    accessToken: "22222222-2222-2222-2222-222222222222",
    status: "PENDING",
    firstName: "سارا",
    lastName: "محمدی",
    phoneNumber: "09121234567",
    address: "خیابان آزادی، پلاک ۱۰",
    city: "تهران",
    postalCode: "1234567890",
    notes: null,
    items: [
        {
            productName: "چادر کوهنوردی ۳ نفره",
            variantDescription: "رنگ: سبز",
            productImage: null,
            sku: "TENT-3P-GRN",
            quantity: 2,
            unitPrice: 4850000,
            totalPrice: 9700000,
        },
    ],
    totalPrice: 9700000,
    createdAt: "2026-10-14T10:00:00Z",
};

function mockFetchOnce(response: Partial<Response>) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => sampleOrder,
        ...response,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
    notFound.mockClear();
});

describe("placeOrder", () => {
    it("posts the checkout details with credentials and returns the created order", async () => {
        const fetchMock = mockFetchOnce({status: 201});

        const result = await placeOrder(sampleRequest);

        expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/orders", {
            method: "POST",
            credentials: "include",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(sampleRequest),
        });
        expect(result).toEqual(sampleOrder);
    });

    it("throws an OrderError carrying the field errors of a validation failure", async () => {
        mockFetchOnce({
            ok: false,
            status: 400,
            json: async () => ({
                code: "VALIDATION_ERROR",
                message: "Validation failed.",
                fieldErrors: [{field: "postalCode", message: "must be 10 digits"}],
            }),
        });

        const error = await placeOrder(sampleRequest).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(OrderError);
        expect(error).toMatchObject({
            code: "VALIDATION_ERROR",
            fieldErrors: [{field: "postalCode", message: "must be 10 digits"}],
        });
    });

    it("throws an OrderError without field errors for a stock conflict", async () => {
        mockFetchOnce({
            ok: false,
            status: 409,
            json: async () => ({code: "CONFLICT", message: "Only 1 unit(s) of TENT-3P-GRN are available."}),
        });

        const error = await placeOrder(sampleRequest).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(OrderError);
        expect(error).toMatchObject({code: "CONFLICT", fieldErrors: []});
    });

    it("falls back to a generic error when the failure response has no JSON body", async () => {
        mockFetchOnce({
            ok: false,
            status: 502,
            json: async () => {
                throw new Error("not json");
            },
        });

        const error = await placeOrder(sampleRequest).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(OrderError);
        expect(error).toMatchObject({code: "UNKNOWN", message: "Order request failed: 502", fieldErrors: []});
    });
});

describe("getOrder", () => {
    it("fetches the order by access token without caching", async () => {
        const fetchMock = mockFetchOnce({});

        const result = await getOrder(sampleOrder.accessToken);

        expect(fetchMock).toHaveBeenCalledWith(
            "http://localhost:8080/api/orders/22222222-2222-2222-2222-222222222222",
            {cache: "no-store"},
        );
        expect(result).toEqual(sampleOrder);
    });

    it("encodes the token so a crafted value cannot change the backend path", async () => {
        const fetchMock = mockFetchOnce({});

        await getOrder("../products");

        expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/orders/..%2Fproducts", {
            cache: "no-store",
        });
    });

    it("calls notFound() for an unknown token", async () => {
        mockFetchOnce({ok: false, status: 404});

        await expect(getOrder("unknown")).rejects.toThrow("NEXT_NOT_FOUND");
        expect(notFound).toHaveBeenCalled();
    });

    it("throws a plain error for other failures, leaving them to the error boundary", async () => {
        mockFetchOnce({ok: false, status: 500});

        await expect(getOrder(sampleOrder.accessToken)).rejects.toThrow("Failed to fetch order: 500");
        expect(notFound).not.toHaveBeenCalled();
    });
});
