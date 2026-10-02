import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import {ProductInfo} from "./ProductInfo";
import {CartProvider} from "@/components/cart/CartProvider";
import type {Cart, ProductDetail} from "@/lib/api/types";

const {getCart} = vi.hoisted(() => ({getCart: vi.fn()}));

vi.mock("@/lib/api/cart", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/api/cart")>()),
    getCart,
}));

const emptyCart: Cart = {id: null, items: [], subtotal: 0, totalPrice: 0};

beforeEach(() => {
    vi.clearAllMocks();
    getCart.mockResolvedValue(emptyCart);
});

const tent: ProductDetail = {
    id: 1,
    name: "چادر کوهنوردی ۳ نفره",
    slug: "tent-3-person-mountaineering",
    shortDescription: "چادر سبک و ضدآب",
    description: "چادری سبک و ضدآب برای کوهنوردی و کمپینگ سه نفره.",
    images: [],
    specifications: {"وزن": "۲.۸ کیلوگرم"},
    categoryName: "کمپینگ و سرپناه",
    categorySlug: "camping-shelter",
    variants: [{id: 1, sku: "TENT-3P-GRN", attributes: {"رنگ": "سبز"}, price: 4850000, stockQuantity: 12}],
};

function renderProductInfo(product: ProductDetail) {
    return render(
        <CartProvider>
            <ProductInfo product={product} />
        </CartProvider>,
    );
}

describe("ProductInfo", () => {
    it("shows the variant selector and add-to-cart control when the product has a variant", () => {
        renderProductInfo(tent);

        expect(screen.getByRole("button", {name: "افزودن به سبد خرید"})).toBeInTheDocument();
    });

    // VariantSelector reads variants[0] unconditionally, so a product with no variants must never reach
    // it - this is a crash guard, not just a nicety.
    it("shows an unavailability message instead of the variant selector when there are no variants", () => {
        renderProductInfo({...tent, variants: []});

        expect(screen.getByText("در حال حاضر این محصول موجود نیست.")).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "افزودن به سبد خرید"})).not.toBeInTheDocument();
    });
});
