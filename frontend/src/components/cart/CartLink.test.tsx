import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import {CartProvider} from "./CartProvider";
import {CartLink} from "./CartLink";
import type {Cart} from "@/lib/api/types";

const {getCart} = vi.hoisted(() => ({getCart: vi.fn()}));

vi.mock("@/lib/api/cart", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/api/cart")>()),
    getCart,
}));

beforeEach(() => {
    vi.clearAllMocks();
});

function emptyCart(): Cart {
    return {id: null, items: [], subtotal: 0, totalPrice: 0};
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
                attributes: {},
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

describe("CartLink", () => {
    it("links to /cart with a plain accessible name and no badge when the cart is empty", async () => {
        getCart.mockResolvedValue(emptyCart());

        render(<CartProvider><CartLink /></CartProvider>);

        const link = await screen.findByRole("link", {name: "سبد خرید"});
        expect(link).toHaveAttribute("href", "/cart");
        expect(screen.queryByText("۴", {exact: false})).not.toBeInTheDocument();
    });

    it("shows the summed quantity (not the number of lines) once the cart loads with items", async () => {
        getCart.mockResolvedValue(cartWithItems());

        render(<CartProvider><CartLink /></CartProvider>);

        // 3 + 1 across two distinct lines = 4.
        await waitFor(() => expect(screen.getByRole("link", {name: "سبد خرید (۴ کالا)"})).toBeInTheDocument());
        expect(screen.getByText("۴")).toBeInTheDocument();
    });
});
