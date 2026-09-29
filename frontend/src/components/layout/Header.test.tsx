import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import {Header} from "./Header";

const searchParams = vi.hoisted(() => ({current: new URLSearchParams()}));
vi.mock("next/navigation", () => ({useSearchParams: () => searchParams.current}));

describe("Header", () => {
    beforeEach(() => {
        searchParams.current = new URLSearchParams();
    });

    it("renders an empty product search that submits to the products page", () => {
        render(<Header />);

        const searchbox = screen.getByRole("searchbox", {name: "جستجوی محصولات"});
        expect(searchbox).toHaveValue("");
        expect(searchbox.closest("form")).toHaveAttribute("action", "/products");
    });

    it("pre-fills the search with the active search term from the URL", () => {
        searchParams.current = new URLSearchParams({search: "چادر", category: "camping-shelter"});
        render(<Header />);

        expect(screen.getByRole("searchbox", {name: "جستجوی محصولات"})).toHaveValue("چادر");
    });

    it("replaces the pre-filled term when the URL's search term changes", () => {
        searchParams.current = new URLSearchParams({search: "چادر"});
        const {rerender} = render(<Header />);

        searchParams.current = new URLSearchParams({search: "چراغ"});
        rerender(<Header />);
        expect(screen.getByRole("searchbox", {name: "جستجوی محصولات"})).toHaveValue("چراغ");

        searchParams.current = new URLSearchParams();
        rerender(<Header />);
        expect(screen.getByRole("searchbox", {name: "جستجوی محصولات"})).toHaveValue("");
    });
});
