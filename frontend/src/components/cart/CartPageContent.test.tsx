import {beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {CartProvider} from "./CartProvider";
import {CartPageContent} from "./CartPageContent";
import {CartError} from "@/lib/api/cart";
import {formatPrice} from "@/lib/format";
import type {Cart} from "@/lib/api/types";

const {getCart, updateCartItemQuantity, removeCartItem} = vi.hoisted(() => ({
    getCart: vi.fn(),
    updateCartItemQuantity: vi.fn(),
    removeCartItem: vi.fn(),
}));

vi.mock("@/lib/api/cart", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/api/cart")>()),
    getCart,
    updateCartItemQuantity,
    removeCartItem,
}));

beforeEach(() => {
    vi.clearAllMocks();
});

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {promise, resolve, reject};
}

function cartWithItems(): Cart {
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
                attributes: {رنگ: "سبز"},
                unitPrice: 4850000,
                quantity: 3,
                totalPrice: 14550000,
                stockQuantity: 12,
            },
            {
                id: 2,
                productVariantId: 11,
                productName: "صندلی تاشو کمپینگ",
                productSlug: "folding-camping-chair",
                primaryImage: null,
                sku: "CHAIR-FOLD-STD",
                attributes: {},
                unitPrice: 950000,
                quantity: 1,
                totalPrice: 950000,
                stockQuantity: 25,
            },
        ],
        subtotal: 15500000,
        totalPrice: 15500000,
    };
}

function emptyCart(): Cart {
    return {id: null, items: [], subtotal: 0, totalPrice: 0};
}

// Mirrors how the real backend would echo the cart back after changing the tent line's quantity,
// so mutation tests exercise the full API -> provider -> UI round trip rather than a canned reply.
function cartWithTentQuantity(quantity: number): Cart {
    const cart = cartWithItems();
    const tent = cart.items[0];
    tent.quantity = quantity;
    tent.totalPrice = tent.unitPrice * quantity;
    cart.subtotal = tent.totalPrice + cart.items[1].totalPrice;
    cart.totalPrice = cart.subtotal;
    return cart;
}

function cartWithoutChair(): Cart {
    const cart = cartWithItems();
    cart.items = [cart.items[0]];
    cart.subtotal = cart.items[0].totalPrice;
    cart.totalPrice = cart.subtotal;
    return cart;
}

function renderPage() {
    return render(
        <CartProvider>
            <CartPageContent />
        </CartProvider>,
    );
}

describe("CartPageContent", () => {
    it("shows a loading message, then the item list with attributes and a single grand total", async () => {
        getCart.mockResolvedValue(cartWithItems());

        renderPage();
        expect(screen.getByText("در حال بارگذاری سبد خرید...")).toBeInTheDocument();

        expect(await screen.findByText("چادر کوهنوردی ۳ نفره")).toBeInTheDocument();
        expect(screen.getByText("رنگ: سبز")).toBeInTheDocument();
        expect(screen.getByText("جمع کل")).toBeInTheDocument();
        expect(screen.getByText(`${(15500000).toLocaleString("fa-IR")} ریال`)).toBeInTheDocument();
    });

    it("links the product thumbnail and name to the product detail page, and scrolls a long list internally", async () => {
        const cart = cartWithItems();
        cart.items[0].primaryImage = "/images/products/tent-3-person-mountaineering/1.jpg";
        getCart.mockResolvedValue(cart);

        renderPage();
        const tentRow = (await screen.findByText("چادر کوهنوردی ۳ نفره")).closest("li") as HTMLElement;

        // Both the thumbnail (its alt text) and the name resolve to the same accessible link name.
        const links = within(tentRow).getAllByRole("link", {name: "چادر کوهنوردی ۳ نفره"});
        expect(links).toHaveLength(2);
        for (const link of links) {
            expect(link).toHaveAttribute("href", "/products/tent-3-person-mountaineering");
        }
        // No real layout/overflow in jsdom - this is the only observable signal that the list is set up
        // to scroll internally once it has many items, instead of just growing the page indefinitely.
        const list = screen.getByRole("list");
        expect(list.className).toContain("overflow-y-auto");
    });

    it("leaves + usable when the item's quantity is below its stock limit", async () => {
        getCart.mockResolvedValue(cartWithItems());

        renderPage();
        // cartWithItems gives the chair quantity 1 and stock 25, so it's nowhere near its limit yet.
        const chairRow = (await screen.findByText("صندلی تاشو کمپینگ")).closest("li") as HTMLElement;

        expect(within(chairRow).getByRole("button", {name: "افزایش تعداد صندلی تاشو کمپینگ"})).not.toBeDisabled();
    });

    it("disables + once the item's quantity reaches its stock limit, leaving - usable", async () => {
        const cart = cartWithItems();
        cart.items = [{...cart.items[1], quantity: 25}];
        getCart.mockResolvedValue(cart);

        renderPage();
        const chairRow = (await screen.findByText("صندلی تاشو کمپینگ")).closest("li") as HTMLElement;

        expect(within(chairRow).getByRole("button", {name: "افزایش تعداد صندلی تاشو کمپینگ"})).toBeDisabled();
        expect(within(chairRow).getByRole("button", {name: "کاهش تعداد صندلی تاشو کمپینگ"})).not.toBeDisabled();
    });

    it("shows the error and a retry button when the initial load fails, and retry recovers", async () => {
        // An unmapped code exercises the generic fallback, which is what a real server/network
        // failure (nothing cart-specific) would hit.
        getCart.mockRejectedValueOnce(new CartError("INTERNAL_ERROR", "Unexpected server error."));
        getCart.mockResolvedValueOnce(cartWithItems());

        renderPage();

        expect(await screen.findByText("خطایی رخ داد.")).toBeInTheDocument();
        const retryButton = screen.getByRole("button", {name: "تلاش دوباره"});

        fireEvent.click(retryButton);

        expect(await screen.findByText("چادر کوهنوردی ۳ نفره")).toBeInTheDocument();
        expect(screen.queryByText("خطایی رخ داد.")).not.toBeInTheDocument();
    });

    it("shows the empty-cart state with a link to /products when there are no items and no error", async () => {
        getCart.mockResolvedValue(emptyCart());

        renderPage();

        expect(await screen.findByText("سبد خرید شما خالی است.")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "مشاهده محصولات"})).toHaveAttribute("href", "/products");
    });

    it("steps quantity up and down, reflecting the backend's returned cart, and disables decrement at quantity 1", async () => {
        getCart.mockResolvedValue(cartWithItems());
        updateCartItemQuantity.mockResolvedValueOnce(cartWithTentQuantity(4));

        renderPage();
        await screen.findByText("چادر کوهنوردی ۳ نفره");
        const tentRow = screen.getByText("چادر کوهنوردی ۳ نفره").closest("li") as HTMLElement;

        fireEvent.click(within(tentRow).getByRole("button", {name: "افزایش تعداد چادر کوهنوردی ۳ نفره"}));
        await waitFor(() => expect(updateCartItemQuantity).toHaveBeenCalledWith(1, 4));
        await waitFor(() => expect(within(tentRow).getByText("۴")).toBeInTheDocument());
        expect(within(tentRow).getByText(formatPrice(19400000))).toBeInTheDocument();

        updateCartItemQuantity.mockResolvedValueOnce(cartWithTentQuantity(3));
        fireEvent.click(within(tentRow).getByRole("button", {name: "کاهش تعداد چادر کوهنوردی ۳ نفره"}));
        await waitFor(() => expect(updateCartItemQuantity).toHaveBeenCalledWith(1, 3));
        await waitFor(() => expect(within(tentRow).getByText("۳")).toBeInTheDocument());

        const chairRow = screen.getByText("صندلی تاشو کمپینگ").closest("li") as HTMLElement;
        expect(within(chairRow).getByRole("button", {name: "کاهش تعداد صندلی تاشو کمپینگ"})).toBeDisabled();
    });

    it("removes the row and updates the total once the backend confirms the removal", async () => {
        getCart.mockResolvedValue(cartWithItems());
        removeCartItem.mockResolvedValue(cartWithoutChair());

        renderPage();
        const chairRow = (await screen.findByText("صندلی تاشو کمپینگ")).closest("li") as HTMLElement;

        fireEvent.click(within(chairRow).getByRole("button", {name: "حذف صندلی تاشو کمپینگ"}));

        await waitFor(() => expect(removeCartItem).toHaveBeenCalledWith(2));
        await waitFor(() => expect(screen.queryByText("صندلی تاشو کمپینگ")).not.toBeInTheDocument());
        expect(screen.getByText("چادر کوهنوردی ۳ نفره")).toBeInTheDocument();
        const totalRow = screen.getByText("جمع کل").closest("div") as HTMLElement;
        expect(within(totalRow).getByText(formatPrice(14550000))).toBeInTheDocument();
    });

    it("shows a fallback message and recovers when removing an item fails with a non-CartError", async () => {
        getCart.mockResolvedValue(cartWithItems());
        removeCartItem.mockRejectedValueOnce(new Error("network down"));

        renderPage();
        const chairRow = (await screen.findByText("صندلی تاشو کمپینگ")).closest("li") as HTMLElement;

        fireEvent.click(within(chairRow).getByRole("button", {name: "حذف صندلی تاشو کمپینگ"}));
        expect(await within(chairRow).findByRole("alert")).toHaveTextContent("خطایی رخ داد.");
        expect(screen.getByText("صندلی تاشو کمپینگ")).toBeInTheDocument();

        removeCartItem.mockResolvedValueOnce(cartWithoutChair());
        fireEvent.click(within(chairRow).getByRole("button", {name: "حذف صندلی تاشو کمپینگ"}));
        await waitFor(() => expect(screen.queryByText("صندلی تاشو کمپینگ")).not.toBeInTheDocument());
    });

    it("disables every row's controls while a mutation is in flight", async () => {
        getCart.mockResolvedValue(cartWithItems());
        const pending = deferred<Cart>();
        updateCartItemQuantity.mockReturnValue(pending.promise);

        renderPage();
        await screen.findByText("چادر کوهنوردی ۳ نفره");

        const tentRow = screen.getByText("چادر کوهنوردی ۳ نفره").closest("li") as HTMLElement;
        const chairRow = screen.getByText("صندلی تاشو کمپینگ").closest("li") as HTMLElement;
        fireEvent.click(within(tentRow).getByRole("button", {name: "افزایش تعداد چادر کوهنوردی ۳ نفره"}));

        await waitFor(() =>
            expect(within(chairRow).getByRole("button", {name: "حذف صندلی تاشو کمپینگ"})).toBeDisabled(),
        );
        expect(within(tentRow).getByRole("button", {name: "حذف چادر کوهنوردی ۳ نفره"})).toBeDisabled();

        pending.resolve(cartWithItems());
        await waitFor(() =>
            expect(within(chairRow).getByRole("button", {name: "حذف صندلی تاشو کمپینگ"})).not.toBeDisabled(),
        );
    });

    it("shows a stock-conflict error attached to the row that caused it, and recovers on the next attempt", async () => {
        getCart.mockResolvedValue(cartWithItems());
        updateCartItemQuantity.mockRejectedValueOnce(
            new CartError("CONFLICT", "Only 3 unit(s) of TENT-3P-GRN are available."),
        );

        renderPage();
        await screen.findByText("چادر کوهنوردی ۳ نفره");

        const tentRow = screen.getByText("چادر کوهنوردی ۳ نفره").closest("li") as HTMLElement;
        const chairRow = screen.getByText("صندلی تاشو کمپینگ").closest("li") as HTMLElement;
        const increment = within(tentRow).getByRole("button", {name: "افزایش تعداد چادر کوهنوردی ۳ نفره"});
        fireEvent.click(increment);

        // The CONFLICT code maps to a fixed Persian message, regardless of the backend's own wording.
        expect(await within(tentRow).findByRole("alert")).toHaveTextContent("موجودی این محصول کافی نیست.");
        // The rejected change was never applied: quantity stays at its pre-attempt value.
        expect(within(tentRow).getByText("۳")).toBeInTheDocument();
        expect(within(chairRow).queryByRole("alert")).not.toBeInTheDocument();

        // The global mutation lock released after the failure, so a retry can still succeed.
        expect(increment).not.toBeDisabled();
        updateCartItemQuantity.mockResolvedValueOnce(cartWithTentQuantity(4));
        fireEvent.click(increment);

        await waitFor(() => expect(within(tentRow).getByText("۴")).toBeInTheDocument());
        expect(within(tentRow).queryByRole("alert")).not.toBeInTheDocument();
    });

    it("lets the shopper dismiss a row error without waiting for another attempt", async () => {
        getCart.mockResolvedValue(cartWithItems());
        updateCartItemQuantity.mockRejectedValueOnce(
            new CartError("CONFLICT", "Only 3 unit(s) of TENT-3P-GRN are available."),
        );

        renderPage();
        await screen.findByText("چادر کوهنوردی ۳ نفره");
        const tentRow = screen.getByText("چادر کوهنوردی ۳ نفره").closest("li") as HTMLElement;
        fireEvent.click(within(tentRow).getByRole("button", {name: "افزایش تعداد چادر کوهنوردی ۳ نفره"}));
        await within(tentRow).findByRole("alert");

        fireEvent.click(within(tentRow).getByRole("button", {name: "بستن پیام خطا"}));

        expect(within(tentRow).queryByRole("alert")).not.toBeInTheDocument();
        // Quantity is untouched either way - dismissing the message isn't a retry.
        expect(within(tentRow).getByText("۳")).toBeInTheDocument();
    });
});
