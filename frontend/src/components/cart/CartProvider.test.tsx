import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import {useEffect} from "react";
import {CartProvider, useCart} from "./CartProvider";
import type {Cart} from "@/lib/api/types";

const {getCart, addCartItem, updateCartItemQuantity, removeCartItem} = vi.hoisted(() => ({
    getCart: vi.fn(),
    addCartItem: vi.fn(),
    updateCartItemQuantity: vi.fn(),
    removeCartItem: vi.fn(),
}));

// Partial mock: keeps the real CartError export so `instanceof CartError` checks here and inside
// CartProvider itself compare against the exact same class, not two different copies.
vi.mock("@/lib/api/cart", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/api/cart")>()),
    getCart,
    addCartItem,
    updateCartItemQuantity,
    removeCartItem,
}));

import {CartError} from "@/lib/api/cart";

beforeEach(() => {
    vi.clearAllMocks();
});

function emptyCart(): Cart {
    return {id: null, items: [], subtotal: 0, totalPrice: 0};
}

function cartWithOneItem(quantity = 1): Cart {
    return {
        id: "11111111-1111-1111-1111-111111111111",
        items: [
            {
                id: 1,
                productVariantId: 10,
                productName: "چادر کوهنوردی ۳ نفره",
                productSlug: "tent-3-person-mountaineering",
                primaryImage: null,
                sku: "TENT-3P-GRN",
                attributes: {},
                unitPrice: 4850000,
                quantity,
                totalPrice: 4850000 * quantity,
                stockQuantity: 20,
            },
        ],
        subtotal: 4850000 * quantity,
        totalPrice: 4850000 * quantity,
    };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {promise, resolve, reject};
}

// onContext runs in an effect, not the render body, so capturing the latest context for the test
// isn't itself a render-phase side effect.
function TestConsumer({onContext}: {onContext: (context: ReturnType<typeof useCart>) => void}) {
    const context = useCart();
    useEffect(() => {
        onContext(context);
    });
    return (
        <div>
            <span data-testid="loading">{String(context.isLoading)}</span>
            <span data-testid="mutating">{String(context.isMutating)}</span>
            <span data-testid="count">{context.cart.items.length}</span>
            <span data-testid="error">{context.error ?? ""}</span>
        </div>
    );
}

function renderCart() {
    let context!: ReturnType<typeof useCart>;
    render(<CartProvider><TestConsumer onContext={(c) => { context = c; }} /></CartProvider>);
    return {
        getContext: () => context,
    };
}

describe("CartProvider", () => {
    it("loads the initial cart and clears isLoading once it resolves", async () => {
        getCart.mockResolvedValue(cartWithOneItem());

        renderCart();

        expect(screen.getByTestId("loading")).toHaveTextContent("true");
        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
        expect(screen.getByTestId("count")).toHaveTextContent("1");
    });

    it("clears isLoading and exposes the error when the initial load fails, and refresh() can recover", async () => {
        getCart.mockRejectedValueOnce(new CartError("UNKNOWN", "Cart request failed: 500"));

        const {getContext} = renderCart();

        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
        // "UNKNOWN" has no specific Persian mapping, so the generic fallback is expected here.
        expect(screen.getByTestId("error")).toHaveTextContent("خطایی رخ داد.");
        expect(screen.getByTestId("count")).toHaveTextContent("0");

        getCart.mockResolvedValueOnce(cartWithOneItem());
        await getContext().refresh();

        await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent(""));
        expect(screen.getByTestId("count")).toHaveTextContent("1");
    });

    it("delegates to addCartItem with the given arguments and updates the shared cart, toggling isMutating", async () => {
        getCart.mockResolvedValue(emptyCart());
        const addDeferred = deferred<Cart>();
        addCartItem.mockReturnValue(addDeferred.promise);

        const {getContext} = renderCart();
        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

        const addPromise = getContext().addItem(10, 1);
        await waitFor(() => expect(screen.getByTestId("mutating")).toHaveTextContent("true"));
        expect(addCartItem).toHaveBeenCalledWith(10, 1);

        addDeferred.resolve(cartWithOneItem());
        await addPromise;

        await waitFor(() => expect(screen.getByTestId("mutating")).toHaveTextContent("false"));
        expect(screen.getByTestId("count")).toHaveTextContent("1");
    });

    it("delegates to updateCartItemQuantity with the given item id and quantity", async () => {
        getCart.mockResolvedValue(emptyCart());
        updateCartItemQuantity.mockResolvedValue(cartWithOneItem(5));

        const {getContext} = renderCart();
        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

        await getContext().updateQuantity(1, 5);

        expect(updateCartItemQuantity).toHaveBeenCalledWith(1, 5);
        await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
    });

    it("delegates to removeCartItem with the given item id", async () => {
        getCart.mockResolvedValue(cartWithOneItem());
        removeCartItem.mockResolvedValue(emptyCart());

        const {getContext} = renderCart();
        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

        await getContext().removeItem(1);

        expect(removeCartItem).toHaveBeenCalledWith(1);
        await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
    });

    it("surfaces a failed mutation's message without clearing the cart, and recovers for the next mutation", async () => {
        getCart.mockResolvedValue(cartWithOneItem());
        addCartItem.mockRejectedValueOnce(new CartError("CONFLICT", "Only 1 unit(s) of TENT-3P-GRN are available."));

        const {getContext} = renderCart();
        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

        await expect(getContext().addItem(10, 5)).rejects.toBeInstanceOf(CartError);

        // The CONFLICT code maps to a fixed Persian message, regardless of the backend's own wording.
        await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("موجودی این محصول کافی نیست."));
        expect(screen.getByTestId("count")).toHaveTextContent("1");
        // The failure must not leave isMutating/the guard stuck "on" - both the display flag and a
        // subsequent mutation actually being allowed to run prove the finally block reset them.
        expect(screen.getByTestId("mutating")).toHaveTextContent("false");

        addCartItem.mockResolvedValueOnce(cartWithOneItem(6));
        await getContext().addItem(10, 5);

        expect(addCartItem).toHaveBeenCalledTimes(2);
        await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent(""));
    });

    it("rejects a mutation attempted while another is still in flight, without calling the API a second time", async () => {
        getCart.mockResolvedValue(emptyCart());
        const addDeferred = deferred<Cart>();
        addCartItem.mockReturnValue(addDeferred.promise);

        const {getContext} = renderCart();
        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

        const first = getContext().addItem(10, 1);
        const second = getContext().addItem(10, 1);

        await expect(second).rejects.toBeInstanceOf(CartError);
        await expect(second).rejects.toMatchObject({code: "CLIENT_BUSY"});
        // The core guarantee: the second call never reaches the API at all.
        expect(addCartItem).toHaveBeenCalledTimes(1);

        addDeferred.resolve(cartWithOneItem());
        await first;
        await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
    });

    it("propagates a mutation made in one CartProvider instance to another, without the second calling the API", async () => {
        // Two instances simulate two tabs: each is its own independent React tree, so this is only a
        // real test of the cross-tab sync (BroadcastChannel) if nothing else connects them.
        getCart.mockResolvedValue(emptyCart());
        updateCartItemQuantity.mockResolvedValue(cartWithOneItem(3));

        const tabA = renderCart();
        const tabB = renderCart();
        await waitFor(() => expect(tabA.getContext().isLoading).toBe(false));
        await waitFor(() => expect(tabB.getContext().isLoading).toBe(false));

        await tabA.getContext().updateQuantity(1, 3);

        await waitFor(() => expect(tabB.getContext().cart.items).toHaveLength(1));
        expect(tabB.getContext().cart.items[0].quantity).toBe(3);
        expect(updateCartItemQuantity).toHaveBeenCalledTimes(1);
    });

    it("throws when used outside a CartProvider", () => {
        function Lonely() {
            useCart();
            return null;
        }

        expect(() => render(<Lonely />)).toThrow("useCart must be used within a CartProvider");
    });
});
