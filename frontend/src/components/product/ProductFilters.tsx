"use client";

import Form from "next/form";
import Link from "next/link";
import type {ChangeEvent} from "react";
import type {Category, ProductSearchParams} from "@/lib/api/types";
import {buildProductSearchQueryString} from "@/lib/parseProductSearchParams";

function submitForm(event: ChangeEvent<HTMLInputElement>) {
    event.currentTarget.form?.requestSubmit();
}

export function ProductFilters({categories, defaultValues}: {categories: Category[]; defaultValues: ProductSearchParams}) {
    const {search, sort, category, inStock} = defaultValues;
    const hasActiveFilters = Boolean(category || inStock);

    return (
        <Form action="/products" className="flex flex-col gap-4">
            {/* Search lives in the header and sort in the toolbar; carry them along so a filter change keeps them. */}
            {search && <input type="hidden" name="search" value={search} />}
            {sort && <input type="hidden" name="sort" value={sort} />}

            <h2 className="font-semibold">فیلترها</h2>

            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm text-zinc-500">دسته‌بندی</legend>
                    {[{slug: "", name: "همه دسته‌ها"}, ...categories].map((option) => (
                        <label key={option.slug} className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name="category"
                                value={option.slug}
                                defaultChecked={(category ?? "") === option.slug}
                                onChange={submitForm}
                                className="size-4 accent-accent"
                            />
                            {option.name}
                        </label>
                    ))}
                </fieldset>
            </div>

            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        name="inStock"
                        value="true"
                        defaultChecked={inStock}
                        onChange={submitForm}
                        className="size-4 rounded accent-accent"
                    />
                    فقط کالاهای موجود
                </label>
            </div>

            {hasActiveFilters && (
                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                    <Link
                        href={`/products${buildProductSearchQueryString({search, sort})}`}
                        className="rounded text-sm text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        پاک کردن فیلترها
                    </Link>
                </div>
            )}
        </Form>
    );
}
