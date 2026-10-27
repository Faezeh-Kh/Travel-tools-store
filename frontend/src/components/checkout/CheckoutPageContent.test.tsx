import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {CartProvider} from "@/components/cart/CartProvider";
import {CartError} from "@/lib/api/cart";
import {OrderError} from "@/lib/api/orders";
import {formatPrice} from "@/lib/format";
import type {Cart, Order} from "@/lib/api/types";
import {CheckoutPageContent} from "./CheckoutPageContent";

const {getCart, placeOrder, replace} = vi.hoisted(() => ({
    getCart: vi.fn(),
    placeOrder: vi.fn(),
    replace: vi.fn(),
}));

// The real CartProvider runs on a mocked getCart, so these tests cover how the page reacts to the cart's
// actual loading/refresh behavior rather than to hand-picked context values.
vi.mock("@/lib/api/cart", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/api/cart")>()),
    getCart,
}));
vi.mock("@/lib/api/orders", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/api/orders")>()),
    placeOrder,
}));
vi.mock("next/navigation", async (importOriginal) => ({
    ...(await importOriginal<typeof import("next/navigation")>()),
    useRouter: () => ({replace}),
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
                quantity: 2,
                totalPrice: 9700000,
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
        subtotal: 10650000,
        totalPrice: 10650000,
    };
}

// The cart without the tent line: what a refresh might return after checkout reported that the cart changed.
function cartWithChairOnly(): Cart {
    const cart = cartWithItems();
    return {...cart, items: [cart.items[1]], subtotal: 950000, totalPrice: 950000};
}

function emptyCart(): Cart {
    return {id: null, items: [], subtotal: 0, totalPrice: 0};
}

const placedOrder: Order = {
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
    items: [],
    totalPrice: 10650000,
    createdAt: "2026-10-27T10:00:00Z",
};

function renderPage() {
    return render(
        <CartProvider>
            <CheckoutPageContent />
        </CartProvider>,
    );
}

function fillAndSubmitValidForm() {
    fireEvent.change(screen.getByLabelText("نام"), {target: {value: "سارا"}});
    fireEvent.change(screen.getByLabelText("نام خانوادگی"), {target: {value: "محمدی"}});
    fireEvent.change(screen.getByLabelText("شماره موبایل"), {target: {value: "09121234567"}});
    fireEvent.change(screen.getByLabelText("شهر"), {target: {value: "تهران"}});
    fireEvent.change(screen.getByLabelText("کد پستی"), {target: {value: "1234567890"}});
    fireEvent.change(screen.getByLabelText("نشانی"), {target: {value: "خیابان آزادی، پلاک ۱۰"}});
    fireEvent.click(screen.getByRole("button", {name: "ثبت سفارش"}));
}

function summary() {
    return screen.getByRole("region", {name: "خلاصه سفارش"});
}

describe("CheckoutPageContent", () => {
    it("shows a loading message, then the form next to a summary of the cart", async () => {
        const pending = deferred<Cart>();
        getCart.mockReturnValue(pending.promise);
        renderPage();

        expect(screen.getByText("در حال بارگذاری سبد خرید...")).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "ثبت سفارش"})).not.toBeInTheDocument();

        await act(async () => pending.resolve(cartWithItems()));

        expect(screen.getByRole("button", {name: "ثبت سفارش"})).toBeInTheDocument();
        const items = within(summary()).getAllByRole("listitem");
        expect(items).toHaveLength(2);
        expect(items[0]).toHaveTextContent("چادر کوهنوردی ۳ نفره");
        expect(items[0]).toHaveTextContent("رنگ: سبز");
        expect(items[0]).toHaveTextContent("× ۲");
        expect(items[0]).toHaveTextContent(formatPrice(9700000));
        expect(summary()).toHaveTextContent(formatPrice(10650000));
    });

    it("offers the products page instead of a form when the cart is empty", async () => {
        getCart.mockResolvedValue(emptyCart());
        renderPage();

        expect(await screen.findByText("سبد خرید شما خالی است.")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "مشاهده محصولات"})).toHaveAttribute("href", "/products");
        expect(screen.queryByRole("button", {name: "ثبت سفارش"})).not.toBeInTheDocument();
    });

    it("shows a load failure with a retry that brings the form back", async () => {
        getCart.mockRejectedValueOnce(new CartError("UNKNOWN", "boom")).mockResolvedValueOnce(cartWithItems());
        renderPage();

        const retry = await screen.findByRole("button", {name: "تلاش دوباره"});
        expect(screen.queryByRole("button", {name: "ثبت سفارش"})).not.toBeInTheDocument();

        fireEvent.click(retry);

        expect(await screen.findByRole("button", {name: "ثبت سفارش"})).toBeInTheDocument();
    });

    it("says the order was placed, not that the cart is empty, while the confirmation page loads", async () => {
        getCart.mockResolvedValueOnce(cartWithItems()).mockResolvedValueOnce(emptyCart());
        placeOrder.mockResolvedValue(placedOrder);
        renderPage();
        await screen.findByRole("button", {name: "ثبت سفارش"});

        fillAndSubmitValidForm();

        await waitFor(() => expect(replace).toHaveBeenCalledOnce());
        // The form's post-order refresh has loaded the (now empty) cart.
        await waitFor(() => expect(getCart).toHaveBeenCalledTimes(2));
        expect(screen.getByRole("status")).toHaveTextContent("سفارش شما ثبت شد");
        expect(screen.queryByText("سبد خرید شما خالی است.")).not.toBeInTheDocument();
    });

    it("keeps the form, its details and its message while a changed cart reloads, then shows the new summary", async () => {
        const reload = deferred<Cart>();
        getCart.mockResolvedValueOnce(cartWithItems()).mockReturnValueOnce(reload.promise);
        placeOrder.mockRejectedValue(new OrderError("CONFLICT", "Only 1 unit(s) of TENT-3P-GRN are available."));
        renderPage();
        await screen.findByRole("button", {name: "ثبت سفارش"});

        fillAndSubmitValidForm();

        // The refresh is still loading: the form stays instead of a loading message replacing it, but no
        // order can be placed from the old summary.
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("سبد خرید شما تغییر کرده است"));
        expect(screen.queryByText("در حال بارگذاری سبد خرید...")).not.toBeInTheDocument();
        expect(screen.getByLabelText("نام")).toHaveValue("سارا");
        expect(screen.getByRole("button", {name: "ثبت سفارش"})).toBeDisabled();

        await act(async () => reload.resolve(cartWithChairOnly()));

        expect(within(summary()).getAllByRole("listitem")).toHaveLength(1);
        expect(summary()).toHaveTextContent(formatPrice(950000));
        expect(screen.getByRole("alert")).toHaveTextContent("سبد خرید شما تغییر کرده است");
        expect(screen.getByLabelText("نام")).toHaveValue("سارا");
        expect(screen.getByRole("button", {name: "ثبت سفارش"})).toBeEnabled();
    });

    it("blocks ordering from an outdated summary when that reload fails, until a retry brings the cart up to date", async () => {
        getCart
            .mockResolvedValueOnce(cartWithItems())
            .mockRejectedValueOnce(new TypeError("Failed to fetch"))
            .mockResolvedValueOnce(cartWithChairOnly());
        placeOrder
            .mockRejectedValueOnce(new OrderError("CONFLICT", "Only 1 unit(s) of TENT-3P-GRN are available."))
            .mockResolvedValueOnce(placedOrder);
        renderPage();
        await screen.findByRole("button", {name: "ثبت سفارش"});

        fillAndSubmitValidForm();

        // The summary still shows the old cart, so ordering stays blocked; the form and its details stay.
        expect(await screen.findByText(/سبد خرید به‌روز نشد/)).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "ثبت سفارش"})).toBeDisabled();
        expect(within(summary()).getAllByRole("listitem")).toHaveLength(2);
        expect(screen.getByLabelText("نام")).toHaveValue("سارا");

        fireEvent.click(screen.getByRole("button", {name: "تلاش دوباره"}));

        await waitFor(() => expect(within(summary()).getAllByRole("listitem")).toHaveLength(1));
        expect(screen.queryByText(/سبد خرید به‌روز نشد/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "ثبت سفارش"}));
        await waitFor(() => expect(replace).toHaveBeenCalledOnce());
        expect(placeOrder).toHaveBeenCalledTimes(2);
    });
});
