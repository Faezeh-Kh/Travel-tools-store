"use client";

import {createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState} from "react";
import {addCartItem, CartError, getCart, removeCartItem, updateCartItemQuantity} from "@/lib/api/cart";
import {cartErrorMessage} from "@/lib/cartErrorMessages";
import type {Cart} from "@/lib/api/types";

const EMPTY_CART: Cart = {id: null, items: [], subtotal: 0, totalPrice: 0};

// Same-origin, cross-tab sync: each tab's CartProvider only holds its own React state, so without this
// a mutation in one tab (e.g. the cart page) never reaches another tab's (e.g. a product page) already-
// rendered stock display until that tab re-fetches on its own. BroadcastChannel never delivers a
// message back to its own sender, so the tab that mutated doesn't need to guard against its own echo.
const CART_SYNC_CHANNEL = "cart-sync";

// Thrown when a mutation is attempted while another one is still in flight, instead of silently
// resolving - a caller awaiting addItem()/etc. must see this as a rejection, not a success. Reuses
// CartError (same shape every other cart failure already has) rather than a new error type, so
// existing `instanceof CartError` handling covers this case too with no special-casing. The message
// argument is English/debug-only - display text comes from cartErrorMessages, keyed by code.
const CART_BUSY_ERROR = new CartError("CLIENT_BUSY", "Client busy: a mutation is already in flight.");

type CartContextValue = {
    // While isLoading is true, cart is just the EMPTY_CART placeholder, not real data. Once isLoading
    // is false, cart has genuinely loaded UNLESS loadError is also set - if the initial fetch failed,
    // cart stays at EMPTY_CART and that's indistinguishable from "a real cart with zero items" by shape
    // alone. Consumers that need to tell these apart must check `loadError`, not just `cart.items.length`.
    cart: Cart;
    isLoading: boolean;
    isMutating: boolean;
    // Reflects only the initial load (or a refresh() re-running it) - never a mutation failure. A
    // mutation's failure rejects to whichever caller triggered it instead; each caller (CartItemRow,
    // VariantSelector) catches it and displays its own message locally, since only the caller knows
    // which row/control the failure belongs to. Cleared on a successful load/refresh, otherwise persists.
    loadError: string | null;
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
    const [loadError, setLoadError] = useState<string | null>(null);
    // A ref, not just the isMutating state: state updates are batched/asynchronous, so a second call
    // fired in the same tick as the first could still read a stale `false`. The ref mutates immediately,
    // making it the correct guard for same-tick re-entrancy; isMutating (state) stays purely for display.
    const isMutatingRef = useRef(false);
    const syncChannelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        if (typeof BroadcastChannel === "undefined") return;
        const channel = new BroadcastChannel(CART_SYNC_CHANNEL);
        channel.onmessage = (event: MessageEvent<Cart>) => setCart(event.data);
        syncChannelRef.current = channel;
        return () => {
            channel.close();
            syncChannelRef.current = null;
        };
    }, []);

    const loadCart = useCallback(async () => {
        setIsLoading(true);
        try {
            setCart(await getCart());
            setLoadError(null);
        } catch (err) {
            setLoadError(cartErrorMessage(err));
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
        try {
            const updated = await mutate();
            setCart(updated);
            syncChannelRef.current?.postMessage(updated);
        } catch (err) {
            // Rethrown, not stored here: a mutation failure belongs to whichever row/control triggered
            // it, not to the shared (load-only) state - the caller catches this and displays its own
            // message locally (see CartItemRow/VariantSelector).
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
            value={{cart, isLoading, isMutating, loadError, addItem, updateQuantity, removeItem, refresh}}
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
