import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, fireEvent, waitFor} from "@testing-library/react";
import {VariantSelector} from "./VariantSelector";
import {CartProvider} from "@/components/cart/CartProvider";
import {CartError} from "@/lib/api/cart";
import type {Cart, ProductVariant} from "@/lib/api/types";

const {getCart, addCartItem} = vi.hoisted(() => ({
    getCart: vi.fn(),
    addCartItem: vi.fn(),
}));

vi.mock("@/lib/api/cart", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/api/cart")>()),
    getCart,
    addCartItem,
}));

const emptyCart: Cart = {id: null, items: [], subtotal: 0, totalPrice: 0};

beforeEach(() => {
    vi.clearAllMocks();
    getCart.mockResolvedValue(emptyCart);
});

function renderVariantSelector(variants: ProductVariant[], productName: string) {
    return render(
        <CartProvider>
            <VariantSelector variants={variants} productName={productName} />
        </CartProvider>,
    );
}

const tentVariants: ProductVariant[] = [
    {id: 1, sku: "TENT-3P-GRN", attributes: {"رنگ": "سبز"}, price: 4850000, stockQuantity: 12},
    {id: 2, sku: "TENT-3P-ORG", attributes: {"رنگ": "نارنجی"}, price: 5200000, stockQuantity: 0},
];

const chairVariants: ProductVariant[] = [
    {id: 1, sku: "CHAIR-FOLD-STD", attributes: {}, price: 950000, stockQuantity: 25},
];

describe("VariantSelector", () => {
    it("renders with the first variant selected by default", () => {
        renderVariantSelector(tentVariants, "چادر کوهنوردی ۳ نفره");

        expect(screen.getByRole("radio", {name: /رنگ: سبز/})).toBeChecked();
        // The selected variant's price appears twice: once in the summary, once in its own option row.
        expect(screen.getAllByText("۴٬۸۵۰٬۰۰۰ تومان")).toHaveLength(2);
        expect(screen.getByText("۱۲ عدد موجود")).toBeInTheDocument();
    });

    it("updates the summary when a different variant is selected", () => {
        renderVariantSelector(tentVariants, "چادر کوهنوردی ۳ نفره");

        fireEvent.click(screen.getByRole("radio", {name: /رنگ: نارنجی/}));

        expect(screen.getByRole("radio", {name: /رنگ: نارنجی/})).toBeChecked();
        expect(screen.getByRole("radio", {name: /رنگ: سبز/})).not.toBeChecked();
        // The newly selected variant's price now appears twice (summary + its own option row)...
        expect(screen.getAllByText("۵٬۲۰۰٬۰۰۰ تومان")).toHaveLength(2);
        // ...while the no-longer-selected variant's price appears only once (its own option row).
        expect(screen.getAllByText("۴٬۸۵۰٬۰۰۰ تومان")).toHaveLength(1);
    });

    it("shows 'ناموجود' for a zero-stock variant", () => {
        renderVariantSelector(tentVariants, "چادر کوهنوردی ۳ نفره");

        fireEvent.click(screen.getByRole("radio", {name: /رنگ: نارنجی/}));

        expect(screen.getByText("ناموجود")).toBeInTheDocument();
    });

    it("shows the selected variant's attributes in the summary, in addition to its option label", () => {
        renderVariantSelector(tentVariants, "چادر کوهنوردی ۳ نفره");

        // "رنگ: سبز" appears twice: once as the option's own label, once in the summary
        // above it, because the green variant is selected by default.
        expect(screen.getAllByText("رنگ: سبز")).toHaveLength(2);
        // "رنگ: نارنجی" appears once: only its own option label, since it isn't selected.
        expect(screen.getAllByText("رنگ: نارنجی")).toHaveLength(1);
    });

    it("does not show an attributes line when the variant has none", () => {
        renderVariantSelector(chairVariants, "صندلی تاشو کمپینگ");

        expect(screen.queryByText(/رنگ:/)).not.toBeInTheDocument();
    });

    it("falls back to the product name as the option label when a variant has no attributes", () => {
        renderVariantSelector(
            [...chairVariants, {id: 2, sku: "CHAIR-FOLD-BLK", attributes: {"رنگ": "مشکی"}, price: 990000, stockQuantity: 3}],
            "صندلی تاشو کمپینگ",
        );

        expect(screen.getByRole("radio", {name: /صندلی تاشو کمپینگ/})).toBeInTheDocument();
    });

    it("does not offer a choice when the product has a single variant", () => {
        renderVariantSelector(chairVariants, "صندلی تاشو کمپینگ");

        expect(screen.queryByRole("radio")).not.toBeInTheDocument();
        // The price appears once, in the summary, rather than again in an option row.
        expect(screen.getAllByText("۹۵۰٬۰۰۰ تومان")).toHaveLength(1);
        expect(screen.getByText("۲۵ عدد موجود")).toBeInTheDocument();
    });

    it("adds the only variant to the cart when the product has a single variant", async () => {
        addCartItem.mockResolvedValue({id: "11111111-1111-1111-1111-111111111111", items: [], subtotal: 0, totalPrice: 0});
        renderVariantSelector(chairVariants, "صندلی تاشو کمپینگ");

        fireEvent.click(screen.getByRole("button", {name: "افزودن به سبد خرید"}));

        await waitFor(() => expect(addCartItem).toHaveBeenCalledWith(1, 1));
    });

    it("adds the selected variant to the cart when the add-to-cart button is clicked", async () => {
        addCartItem.mockResolvedValue({
            id: "11111111-1111-1111-1111-111111111111",
            items: [],
            subtotal: 0,
            totalPrice: 0,
        });
        renderVariantSelector(tentVariants, "چادر کوهنوردی ۳ نفره");

        fireEvent.click(screen.getByRole("button", {name: "افزودن به سبد خرید"}));

        await waitFor(() => expect(addCartItem).toHaveBeenCalledWith(1, 1));
    });

    it("disables the add-to-cart button when the selected variant is out of stock", () => {
        renderVariantSelector(tentVariants, "چادر کوهنوردی ۳ نفره");

        fireEvent.click(screen.getByRole("radio", {name: /رنگ: نارنجی/}));

        expect(screen.getByRole("button", {name: "افزودن به سبد خرید"})).toBeDisabled();
    });

    it("subtracts quantity already in the cart from the displayed available stock", async () => {
        getCart.mockResolvedValue({
            id: "11111111-1111-1111-1111-111111111111",
            items: [
                {
                    id: 1,
                    productVariantId: 1,
                    productName: "چادر کوهنوردی ۳ نفره",
                    productSlug: "tent-3-person-mountaineering",
                    primaryImage: null,
                    sku: "TENT-3P-GRN",
                    attributes: {"رنگ": "سبز"},
                    unitPrice: 4850000,
                    quantity: 5,
                    totalPrice: 4850000 * 5,
                    stockQuantity: 12,
                },
            ],
            subtotal: 4850000 * 5,
            totalPrice: 4850000 * 5,
        });
        renderVariantSelector(tentVariants, "چادر کوهنوردی ۳ نفره");

        // Stock is 12, 5 already in the cart -> 7 can still be added.
        expect(await screen.findByText("۷ عدد موجود")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "افزودن به سبد خرید"})).not.toBeDisabled();
    });

    it("accounts for stock already in the cart, disabling the button once no more can be added", async () => {
        getCart.mockResolvedValue({
            id: "11111111-1111-1111-1111-111111111111",
            items: [
                {
                    id: 1,
                    productVariantId: 1,
                    productName: "چادر کوهنوردی ۳ نفره",
                    productSlug: "tent-3-person-mountaineering",
                    primaryImage: null,
                    sku: "TENT-3P-GRN",
                    attributes: {"رنگ": "سبز"},
                    unitPrice: 4850000,
                    quantity: 12,
                    totalPrice: 4850000 * 12,
                    stockQuantity: 12,
                },
            ],
            subtotal: 4850000 * 12,
            totalPrice: 4850000 * 12,
        });
        renderVariantSelector(tentVariants, "چادر کوهنوردی ۳ نفره");

        expect(await screen.findByText("تمام موجودی این گزینه در سبد خرید شماست.")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "افزودن به سبد خرید"})).toBeDisabled();
    });

    it("shows an error message when adding to the cart fails", async () => {
        addCartItem.mockRejectedValueOnce(new CartError("CONFLICT", "Only 5 unit(s) of TENT-3P-GRN are available."));
        renderVariantSelector(tentVariants, "چادر کوهنوردی ۳ نفره");

        fireEvent.click(screen.getByRole("button", {name: "افزودن به سبد خرید"}));

        // The CONFLICT code maps to a fixed Persian message, regardless of the backend's own wording.
        expect(await screen.findByRole("alert")).toHaveTextContent("موجودی این محصول کافی نیست.");
    });

    it("lets the shopper dismiss the add-to-cart error", async () => {
        addCartItem.mockRejectedValueOnce(new CartError("CONFLICT", "Only 5 unit(s) of TENT-3P-GRN are available."));
        renderVariantSelector(tentVariants, "چادر کوهنوردی ۳ نفره");

        fireEvent.click(screen.getByRole("button", {name: "افزودن به سبد خرید"}));
        await screen.findByRole("alert");

        fireEvent.click(screen.getByRole("button", {name: "بستن پیام خطا"}));

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
