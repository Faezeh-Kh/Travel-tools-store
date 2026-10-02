"use client";

import {createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState} from "react";
import {addCartItem, CartError, getCart, removeCartItem, updateCartItemQuantity} from "@/lib/api/cart";
import {cartErrorMessage} from "@/lib/cartErrorMessages";
import type {Cart} from "@/lib/api/types";

const EMPTY_CART: Cart = {id: null, items: [], subtotal: 0, totalPrice: 0};

// Thrown when a mutation is attempted while another one is still in flight, instead of silently
// resolving - a caller awaiting addItem()/etc. must see this as a rejection, not a success. Reuses
// CartError (same shape every other cart failure already has) rather than a new error type, so
// existing `instanceof CartError` handling covers this case too with no special-casing. Deliberately
// does NOT set the shared `error` state (see the throw site below) - it's caller-only. The message
// argument is English/debug-only - display text comes from cartErrorMessages, keyed by code.
const CART_BUSY_ERROR = new CartError("CLIENT_BUSY", "Client busy: a mutation is already in flight.");

type CartContextValue = {
    // While isLoading is true, cart is just the EMPTY_CART placeholder, not real data. Once isLoading
    // is false, cart has genuinely loaded UNLESS error is also set - if the initial fetch failed, cart
    // stays at EMPTY_CART and that's indistinguishable from "a real cart with zero items" by shape
    // alone. Consumers that need to tell these apart must check `error`, not just `cart.items.length`.
    cart: Cart;
    isLoading: boolean;
    isMutating: boolean;
    // Reflects the most recent failure of the initial load OR a mutation - not a client-side guard
    // rejection (see CART_BUSY_ERROR above), which is surfaced only via the rejected promise to
    // whichever caller triggered it. Cleared at the start of every mutation and on a successful refresh,
    // but NOT automatically otherwise - it can persist until one of those happens.
    error: string | null;
    addItem: (productVariantId: number, quantity: number) => Promise<void>;
    updateQuantity: (itemId: number, quantity: number) => Promise<void>;
    removeItem: (itemId: number) => Promise<void>;
    // Re-runs the initial load. The only way to recover if that load failed, since nothing else
    // automatically retries it.
    refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({children}: { children: ReactNode }) {
    const [cart, setCart] = useState<Cart>(EMPTY_CART);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // A ref, not just the isMutating state: state updates are batched/asynchronous, so a second call
    // fired in the same tick as the first could still read a stale `false`. The ref mutates immediately,
    // making it the correct guard for same-tick re-entrancy; isMutating (state) stays purely for display.
    const isMutatingRef = useRef(false);

    const loadCart = useCallback(async () => {
        setIsLoading(true);
        try {
            setCart(await getCart());
            setError(null);
        } catch (err) {
            setError(cartErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // This rule pushes toward data-fetching libraries (SWR/React Query), which this project
        // deliberately doesn't have (no justified need for one elsewhere yet). Fetching the cart once
        // on mount via plain fetch + setState in the resolved/rejected continuation is the standard,
        // correct pattern for exactly this case without one.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadCart();
    }, [loadCart]);

    const refresh = loadCart;

    const runMutation = useCallback(async (mutate: () => Promise<Cart>) => {
        if (isMutatingRef.current) {
            throw CART_BUSY_ERROR;
        }
        isMutatingRef.current = true;
        setIsMutating(true);
        setError(null);
        try {
            setCart(await mutate());
        } catch (err) {
            setError(cartErrorMessage(err));
            throw err;
        } finally {
            isMutatingRef.current = false;
            setIsMutating(false);
        }
    }, []);

    const addItem = useCallback(
        (productVariantId: number, quantity: number) => runMutation(() => addCartItem(productVariantId, quantity)),
        [runMutation],
    );
    const updateQuantity = useCallback(
        (itemId: number, quantity: number) => runMutation(() => updateCartItemQuantity(itemId, quantity)),
        [runMutation],
    );
    const removeItem = useCallback(
        (itemId: number) => runMutation(() => removeCartItem(itemId)),
        [runMutation],
    );

    return (
        <CartContext.Provider
            value={{cart, isLoading, isMutating, error, addItem, updateQuantity, removeItem, refresh}}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextValue {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
