import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {ProductSortSelect} from "./ProductSortSelect";

function formOf(container: HTMLElement): HTMLFormElement {
    return container.querySelector("form")!;
}

describe("ProductSortSelect", () => {
    it("defaults to the default sort order and pre-selects the active one", () => {
        const {rerender} = render(<ProductSortSelect defaultValues={{}} />);
        expect(screen.getByRole("combobox", {name: "مرتب‌سازی:"})).toHaveDisplayValue("پیش‌فرض");

        rerender(<ProductSortSelect key="sorted" defaultValues={{sort: "price-asc"}} />);
        expect(screen.getByRole("combobox", {name: "مرتب‌سازی:"})).toHaveDisplayValue("قیمت: کم به زیاد");
    });

    it("carries the active search and filters, and nothing else, alongside the sort", () => {
        const {container} = render(
            <ProductSortSelect
                defaultValues={{search: "چادر", category: "camping-shelter", inStock: true, sort: "newest", page: 3}}
            />,
        );
        const data = new FormData(formOf(container));

        expect(data.get("search")).toBe("چادر");
        expect(data.get("category")).toBe("camping-shelter");
        expect(data.get("inStock")).toBe("true");
        expect(data.getAll("sort")).toEqual(["newest"]);
        expect(data.has("page")).toBe(false);
    });

    it("omits search and filters when they are not active", () => {
        const {container} = render(<ProductSortSelect defaultValues={{}} />);
        const data = new FormData(formOf(container));

        expect(data.has("search")).toBe(false);
        expect(data.has("category")).toBe(false);
        expect(data.has("inStock")).toBe(false);
    });

    it("submits when the sort order changes", () => {
        const {container} = render(<ProductSortSelect defaultValues={{}} />);
        const onSubmit = vi.fn((event: Event) => event.preventDefault());
        formOf(container).addEventListener("submit", onSubmit);

        fireEvent.change(screen.getByRole("combobox", {name: "مرتب‌سازی:"}), {target: {value: "price-desc"}});
        expect(onSubmit).toHaveBeenCalledOnce();
    });
});
