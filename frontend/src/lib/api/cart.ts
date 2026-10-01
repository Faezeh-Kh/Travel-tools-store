import {PUBLIC_API_BASE_URL} from "./config";
import type {Cart} from "./types";

// Not "CartApiError": this type is also used for client-side-only failures that never touch the API
// (CartProvider's busy guard), so a name implying "the API returned this" would overclaim.
export class CartError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = "CartError";
        this.code = code;
    }
}

async function toCart(response: Response): Promise<Cart> {
    if (!response.ok) {
        const body: {code?: string; message?: string} | null = await response.json().catch(() => null);
        throw new CartError(
            body?.code ?? "UNKNOWN",
            body?.message ?? `Cart request failed: ${response.status}`,
        );
    }
    return response.json() as Promise<Cart>;
}

export async function getCart(): Promise<Cart> {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/cart`, {credentials: "include"});
    return toCart(response);
}

export async function addCartItem(productVariantId: number, quantity: number): Promise<Cart> {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/cart/items`, {
        method: "POST",
        credentials: "include",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({productVariantId, quantity}),
    });
    return toCart(response);
}

export async function updateCartItemQuantity(itemId: number, quantity: number): Promise<Cart> {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/cart/items/${itemId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({quantity}),
    });
    return toCart(response);
}

export async function removeCartItem(itemId: number): Promise<Cart> {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/api/cart/items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
    });
    return toCart(response);
}
