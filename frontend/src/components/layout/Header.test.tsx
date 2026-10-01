import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import {Header} from "./Header";
import {CartProvider} from "@/components/cart/CartProvider";

const searchParams = vi.hoisted(() => ({current: new URLSearchParams()}));
vi.mock("next/navigation", () => ({useSearchParams: () => searchParams.current}));

// Header renders CartLink, which needs a CartProvider ancestor; getCart is mocked so that provider's
// own initial fetch doesn't make a real network call in this unrelated-to-cart test file.
const {getCart} = vi.hoisted(() => ({getCart: vi.fn()}));
vi.mock("@/lib/api/cart", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/api/cart")>()),
    getCart,
}));

function renderHeader() {
    return render(<CartProvider><Header /></CartProvider>);
}

describe("Header", () => {
    beforeEach(() => {
        searchParams.current = new URLSearchParams();
        getCart.mockResolvedValue({id: null, items: [], subtotal: 0, totalPrice: 0});
    });

    it("renders an empty product search that submits to the products page", () => {
        renderHeader();

        const searchbox = screen.getByRole("searchbox", {name: "جستجوی محصولات"});
        expect(searchbox).toHaveValue("");
        expect(searchbox.closest("form")).toHaveAttribute("action", "/products");
    });

    it("pre-fills the search with the active search term from the URL", () => {
        searchParams.current = new URLSearchParams({search: "چادر", category: "camping-shelter"});
        renderHeader();

        expect(screen.getByRole("searchbox", {name: "جستجوی محصولات"})).toHaveValue("چادر");
    });

    it("replaces the pre-filled term when the URL's search term changes", () => {
        searchParams.current = new URLSearchParams({search: "چادر"});
        const {rerender} = renderHeader();

        searchParams.current = new URLSearchParams({search: "چراغ"});
        rerender(<CartProvider><Header /></CartProvider>);
        expect(screen.getByRole("searchbox", {name: "جستجوی محصولات"})).toHaveValue("چراغ");

        searchParams.current = new URLSearchParams();
        rerender(<CartProvider><Header /></CartProvider>);
        expect(screen.getByRole("searchbox", {name: "جستجوی محصولات"})).toHaveValue("");
    });
});
