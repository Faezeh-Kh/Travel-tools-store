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
        expect(screen.queryByRole("button", {name: "پاک کردن فیلترها"})).not.toBeInTheDocument();
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

    it("clears only the filters and submits, keeping the active search and sort", () => {
        const {container} = render(
            <ProductFilters
                categories={categories}
                defaultValues={{search: "چادر", sort: "price-desc", category: "camping-shelter", inStock: true}}
            />,
        );
        const submitted: FormData[] = [];
        formOf(container).addEventListener("submit", (event) => {
            event.preventDefault();
            submitted.push(new FormData(formOf(container)));
        });

        fireEvent.click(screen.getByRole("button", {name: "پاک کردن فیلترها"}));

        expect(submitted).toHaveLength(1);
        expect(submitted[0].get("search")).toBe("چادر");
        expect(submitted[0].get("sort")).toBe("price-desc");
        expect(submitted[0].get("category")).toBe("");
        expect(submitted[0].has("inStock")).toBe(false);
    });

    it("offers to clear filters when only the in-stock filter is active", () => {
        render(<ProductFilters categories={categories} defaultValues={{inStock: true}} />);

        expect(screen.getByRole("button", {name: "پاک کردن فیلترها"})).toBeInTheDocument();
    });

    it("in apply mode, waits for the apply button instead of submitting on every change", () => {
        const {container} = render(
            <ProductFilters categories={categories} defaultValues={{}} submitOnChange={false} />,
        );
        const onSubmit = vi.fn((event: Event) => event.preventDefault());
        formOf(container).addEventListener("submit", onSubmit);

        fireEvent.click(screen.getByRole("radio", {name: "روشنایی و برق"}));
        fireEvent.click(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"}));
        expect(onSubmit).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", {name: "مشاهده نتایج"}));
        expect(onSubmit).toHaveBeenCalledOnce();
        const data = new FormData(formOf(container));
        expect(data.get("category")).toBe("lighting-power");
        expect(data.get("inStock")).toBe("true");
    });

    it("has no apply button when changes are submitted immediately", () => {
        render(<ProductFilters categories={categories} defaultValues={{}} />);

        expect(screen.queryByRole("button", {name: "مشاهده نتایج"})).not.toBeInTheDocument();
    });

    it("in apply mode, offers to clear as soon as a filter is selected, even before it is applied", () => {
        render(<ProductFilters categories={categories} defaultValues={{}} submitOnChange={false} />);
        expect(screen.queryByRole("button", {name: "پاک کردن فیلترها"})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("radio", {name: "روشنایی و برق"}));
        expect(screen.getByRole("button", {name: "پاک کردن فیلترها"})).toBeInTheDocument();
    });

    it("hides the clear button again once every filter is deselected", () => {
        render(<ProductFilters categories={categories} defaultValues={{}} submitOnChange={false} />);

        fireEvent.click(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"}));
        expect(screen.getByRole("button", {name: "پاک کردن فیلترها"})).toBeInTheDocument();

        fireEvent.click(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"}));
        expect(screen.queryByRole("button", {name: "پاک کردن فیلترها"})).not.toBeInTheDocument();
    });
});
