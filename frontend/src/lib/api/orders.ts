import {notFound} from "next/navigation";
import {API_BASE_URL, PUBLIC_API_BASE_URL} from "./config";
import type {FieldError, Order, PlaceOrderRequest} from "./types";

// Like CartError, but it also carries the backend's per-field validation errors, so the checkout form can
// show each message next to the field it belongs to.
export class OrderError extends Error {
    readonly code: string;
    readonly fieldErrors: FieldError[];

    constructor(code: string, message: string, fieldErrors: FieldError[] = []) {
        super(message);
        this.name = "OrderError";
        this.code = code;
        this.fieldErrors = fieldErrors;
    }
}

// Runs in the browser: the order is placed from the visitor's cart, which the backend finds through the
// HTTP-only cartId cookie - hence credentials: "include" and the public base URL, as in cart.ts.
export async function placeOrder(request: PlaceOrderRequest): Promise<Order> {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/orders`, {
        method: "POST",
        credentials: "include",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const body: { code?: string; message?: string; fieldErrors?: FieldError[] } | null =
            await response.json().catch(() => null);
        throw new OrderError(
            body?.code ?? "UNKNOWN",
            body?.message ?? `Order request failed: ${response.status}`,
            body?.fieldErrors ?? [],
        );
    }

    return response.json() as Promise<Order>;
}

// Runs on the server (the confirmation page). The access token comes from the URL, so it is encoded:
// a crafted value such as "../products" must stay a single path segment, not change the backend path.
// no-store: the order holds personal details and must never be cached by Next.js.
export async function getOrder(accessToken: string): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(accessToken)}`, {
        cache: "no-store",
    });

    if (response.status === 404) {
        notFound();
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.status}`);
    }

    return response.json() as Promise<Order>;
}
