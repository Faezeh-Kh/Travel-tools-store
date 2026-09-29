import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {ProductFilters} from "./ProductFilters";
import type {Category} from "@/lib/api/types";

const categories: Category[] = [
    {id: 1, name: "کمپینگ و سرپناه", slug: "camping-shelter", description: "توضیحات", imageUrl: null},
    {id: 2, name: "روشنایی و برق", slug: "lighting-power", description: "توضیحات", imageUrl: null},
];

function formOf(container: HTMLElement): HTMLFormElement {
    return container.querySelector("form")!;
}

describe("ProductFilters", () => {
    it("offers every category as a radio, defaulting to all categories and no in-stock filter", () => {
        render(<ProductFilters categories={categories} defaultValues={{}} />);

        expect(screen.getByRole("radio", {name: "همه دسته‌ها"})).toBeChecked();
        expect(screen.getByRole("radio", {name: "کمپینگ و سرپناه"})).not.toBeChecked();
        expect(screen.getByRole("radio", {name: "روشنایی و برق"})).not.toBeChecked();
        expect(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"})).not.toBeChecked();
        expect(screen.queryByRole("link", {name: "پاک کردن فیلترها"})).not.toBeInTheDocument();
    });

    it("pre-selects the active category and in-stock filter", () => {
        render(<ProductFilters categories={categories} defaultValues={{category: "lighting-power", inStock: true}} />);

        expect(screen.getByRole("radio", {name: "روشنایی و برق"})).toBeChecked();
        expect(screen.getByRole("radio", {name: "همه دسته‌ها"})).not.toBeChecked();
        expect(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"})).toBeChecked();
    });

    it("carries the active search and sort, and nothing else, alongside its own controls", () => {
        const {container} = render(
            <ProductFilters
                categories={categories}
                defaultValues={{search: "چادر", sort: "price-asc", category: "camping-shelter", inStock: true, page: 2}}
            />,
        );
        const data = new FormData(formOf(container));

        expect(data.get("search")).toBe("چادر");
        expect(data.get("sort")).toBe("price-asc");
        expect(data.getAll("category")).toEqual(["camping-shelter"]);
        expect(data.getAll("inStock")).toEqual(["true"]);
        expect(data.has("page")).toBe(false);
    });

    it("omits search and sort when they are not active", () => {
        const {container} = render(<ProductFilters categories={categories} defaultValues={{}} />);
        const data = new FormData(formOf(container));

        expect(data.has("search")).toBe(false);
        expect(data.has("sort")).toBe(false);
    });

    it("submits when a category is chosen or the in-stock filter is toggled", () => {
        const {container} = render(<ProductFilters categories={categories} defaultValues={{}} />);
        const onSubmit = vi.fn((event: Event) => event.preventDefault());
        formOf(container).addEventListener("submit", onSubmit);

        fireEvent.click(screen.getByRole("radio", {name: "روشنایی و برق"}));
        expect(onSubmit).toHaveBeenCalledOnce();

        fireEvent.click(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"}));
        expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("clears only the filters, keeping the active search and sort", () => {
        render(
            <ProductFilters
                categories={categories}
                defaultValues={{search: "چادر", sort: "price-desc", category: "camping-shelter"}}
            />,
        );

        expect(screen.getByRole("link", {name: "پاک کردن فیلترها"})).toHaveAttribute(
            "href",
            "/products?search=%DA%86%D8%A7%D8%AF%D8%B1&sort=price-desc",
        );
    });

    it("offers to clear filters when only the in-stock filter is active", () => {
        render(<ProductFilters categories={categories} defaultValues={{inStock: true}} />);

        expect(screen.getByRole("link", {name: "پاک کردن فیلترها"})).toHaveAttribute("href", "/products");
    });
});
