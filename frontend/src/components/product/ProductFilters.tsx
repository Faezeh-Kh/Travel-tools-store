"use client";

import Form from "next/form";
import {useState, type ChangeEvent, type MouseEvent} from "react";
import type {Category, ProductSearchParams} from "@/lib/api/types";

function submitForm(event: ChangeEvent<HTMLInputElement>) {
    event.currentTarget.form?.requestSubmit();
}

function hasSelectedFilters(form: HTMLFormElement): boolean {
    const data = new FormData(form);
    return Boolean(data.get("category") || data.get("inStock"));
}

// Runs before the clear button's submit, so the form is submitted with no category and no in-stock filter
// (the hidden search and sort inputs are kept).
function resetFilterControls(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form!;
    form.querySelector<HTMLInputElement>('input[name="category"][value=""]')!.checked = true;
    form.querySelector<HTMLInputElement>('input[name="inStock"]')!.checked = false;
}

export function ProductFilters({
    categories,
    defaultValues,
    submitOnChange = true,
}: {
    categories: Category[];
    defaultValues: ProductSearchParams;
    // The desktop sidebar applies each change immediately; the mobile drawer collects changes and applies
    // them with an explicit button, so the page does not reload behind the drawer after every tap.
    submitOnChange?: boolean;
}) {
    const {search, sort, category, inStock} = defaultValues;
    // Tracks the form's current selection rather than the URL, because in the drawer choices are only applied
    // later; the clear button should appear as soon as anything is selected.
    const [hasSelection, setHasSelection] = useState(Boolean(category || inStock));
    const onChange = submitOnChange ? submitForm : undefined;

    return (
        <Form
            action="/products"
            onChange={(event) => setHasSelection(hasSelectedFilters(event.currentTarget))}
            className="flex flex-col gap-4"
        >
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
                                onChange={onChange}
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
                        onChange={onChange}
                        className="size-4 rounded accent-accent"
                    />
                    فقط کالاهای موجود
                </label>
            </div>

            {hasSelection && (
                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                    <button
                        type="submit"
                        onClick={resetFilterControls}
                        className="rounded text-sm text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        پاک کردن فیلترها
                    </button>
                </div>
            )}

            {!submitOnChange && (
                <button
                    type="submit"
                    className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    مشاهده نتایج
                </button>
            )}
        </Form>
    );
}
