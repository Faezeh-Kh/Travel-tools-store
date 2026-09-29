"use client";

import Form from "next/form";
import type {ChangeEvent} from "react";
import type {Category, ProductSearchParams, ProductSort} from "@/lib/api/types";

const SORT_LABELS: Record<ProductSort, string> = {
    newest: "جدیدترین",
    "price-asc": "قیمت: کم به زیاد",
    "price-desc": "قیمت: زیاد به کم",
};

function submitForm(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    event.currentTarget.form?.requestSubmit();
}

function CategorySelect({categories, defaultValue}: {categories: Category[]; defaultValue?: string}) {
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor="product-category" className="text-sm text-zinc-500">
                دسته‌بندی
            </label>
            <select
                id="product-category"
                name="category"
                defaultValue={defaultValue ?? ""}
                onChange={submitForm}
                className="rounded-md border border-zinc-300 bg-background px-3 py-1.5 text-foreground dark:border-zinc-700"
            >
                <option value="">همه دسته‌ها</option>
                {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                        {category.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

function SortSelect({defaultValue}: {defaultValue?: ProductSort}) {
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor="product-sort" className="text-sm text-zinc-500">
                مرتب‌سازی
            </label>
            <select
                id="product-sort"
                name="sort"
                defaultValue={defaultValue ?? ""}
                onChange={submitForm}
                className="rounded-md border border-zinc-300 bg-background px-3 py-1.5 text-foreground dark:border-zinc-700"
            >
                <option value="">پیش‌فرض</option>
                {(Object.keys(SORT_LABELS) as ProductSort[]).map((value) => (
                    <option key={value} value={value}>
                        {SORT_LABELS[value]}
                    </option>
                ))}
            </select>
        </div>
    );
}

function InStockCheckbox({defaultChecked}: {defaultChecked?: boolean}) {
    return (
        <label className="flex items-center gap-2 pb-1.5 text-sm text-foreground">
            <input
                type="checkbox"
                name="inStock"
                value="true"
                defaultChecked={defaultChecked}
                onChange={submitForm}
                className="size-4 rounded border-zinc-300 accent-accent dark:border-zinc-700"
            />
            فقط کالاهای موجود
        </label>
    );
}

export function ProductFilterBar({categories, defaultValues}: {categories: Category[]; defaultValues: ProductSearchParams}) {
    return (
        <Form action="/products" className="flex flex-wrap items-end gap-4">
            {/* Searching happens in the header; this keeps the active search term when a filter changes. */}
            {defaultValues.search && <input type="hidden" name="search" value={defaultValues.search} />}
            <CategorySelect categories={categories} defaultValue={defaultValues.category} />
            <SortSelect defaultValue={defaultValues.sort} />
            <InStockCheckbox defaultChecked={defaultValues.inStock} />
        </Form>
    );
}
