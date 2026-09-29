"use client";

import Form from "next/form";
import type {ProductSearchParams, ProductSort} from "@/lib/api/types";

const SORT_LABELS: Record<ProductSort, string> = {
    newest: "جدیدترین",
    "price-asc": "قیمت: کم به زیاد",
    "price-desc": "قیمت: زیاد به کم",
};

export function ProductSortSelect({defaultValues}: {defaultValues: ProductSearchParams}) {
    const {search, category, inStock, sort} = defaultValues;

    return (
        <Form action="/products">
            {/* The filters live in the sidebar; carry them along so a sort change keeps them. */}
            {search && <input type="hidden" name="search" value={search} />}
            {category && <input type="hidden" name="category" value={category} />}
            {inStock && <input type="hidden" name="inStock" value="true" />}

            <label className="flex items-center gap-2 text-sm text-zinc-500">
                مرتب‌سازی:
                <select
                    name="sort"
                    defaultValue={sort ?? ""}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                    className="rounded-md border border-zinc-300 bg-background px-3 py-1.5 text-foreground dark:border-zinc-700"
                >
                    <option value="">پیش‌فرض</option>
                    {(Object.keys(SORT_LABELS) as ProductSort[]).map((value) => (
                        <option key={value} value={value}>
                            {SORT_LABELS[value]}
                        </option>
                    ))}
                </select>
            </label>
        </Form>
    );
}
