import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {ProductFilterBar} from "./ProductFilterBar";
import type {Category} from "@/lib/api/types";

const categories: Category[] = [
    {id: 1, name: "کمپینگ و سرپناه", slug: "camping-shelter", description: "توضیحات", imageUrl: null},
    {id: 2, name: "روشنایی و برق", slug: "lighting-power", description: "توضیحات", imageUrl: null},
];

describe("ProductFilterBar", () => {
    it("renders category options, sort options, and defaults category/sort/in-stock to unset", () => {
        render(<ProductFilterBar categories={categories} defaultValues={{}} />);

        expect(screen.getByRole("combobox", {name: "دسته‌بندی"})).toHaveDisplayValue("همه دسته‌ها");
        expect(screen.getByRole("option", {name: "کمپینگ و سرپناه"})).toBeInTheDocument();
        expect(screen.getByRole("option", {name: "روشنایی و برق"})).toBeInTheDocument();
        expect(screen.getByRole("combobox", {name: "مرتب‌سازی"})).toHaveDisplayValue("پیش‌فرض");
        expect(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"})).not.toBeChecked();
    });

    it("pre-fills every control from the given default values", () => {
        render(
            <ProductFilterBar
                categories={categories}
                defaultValues={{search: "چادر", category: "lighting-power", sort: "price-asc", inStock: true}}
            />,
        );

        expect(screen.getByRole("combobox", {name: "دسته‌بندی"})).toHaveDisplayValue("روشنایی و برق");
        expect(screen.getByRole("combobox", {name: "مرتب‌سازی"})).toHaveDisplayValue("قیمت: کم به زیاد");
        expect(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"})).toBeChecked();
    });

    it("submits the form when the category, sort, or in-stock controls change", () => {
        const {container} = render(<ProductFilterBar categories={categories} defaultValues={{}} />);
        const onSubmit = vi.fn((event: Event) => event.preventDefault());
        container.querySelector("form")!.addEventListener("submit", onSubmit);

        fireEvent.change(screen.getByRole("combobox", {name: "دسته‌بندی"}), {target: {value: "lighting-power"}});
        expect(onSubmit).toHaveBeenCalledOnce();

        fireEvent.change(screen.getByRole("combobox", {name: "مرتب‌سازی"}), {target: {value: "price-desc"}});
        expect(onSubmit).toHaveBeenCalledTimes(2);

        fireEvent.click(screen.getByRole("checkbox", {name: "فقط کالاهای موجود"}));
        expect(onSubmit).toHaveBeenCalledTimes(3);
    });

    it("does not render its own search box", () => {
        render(<ProductFilterBar categories={categories} defaultValues={{search: "چادر"}} />);

        expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    });

    it("keeps the active search term when a filter is submitted", () => {
        const {container} = render(<ProductFilterBar categories={categories} defaultValues={{search: "چادر"}} />);

        expect(new FormData(container.querySelector("form")!).get("search")).toBe("چادر");
    });

    it("does not submit an empty search term when there is no active search", () => {
        const {container} = render(<ProductFilterBar categories={categories} defaultValues={{}} />);

        expect(new FormData(container.querySelector("form")!).has("search")).toBe(false);
    });
});
