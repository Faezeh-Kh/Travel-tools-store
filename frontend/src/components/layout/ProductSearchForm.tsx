"use client";

import Form from "next/form";
import {useId} from "react";
import {SearchIcon} from "@/components/icons/SearchIcon";

export function ProductSearchForm({defaultValue, className}: {defaultValue?: string; className?: string}) {
    // useId rather than a fixed id keeps the label tied to its own input even if the form is rendered more than once.
    const inputId = useId();

    return (
        <Form action="/products" className={className}>
            <div className="flex w-full max-w-md flex-row-reverse items-center gap-2 rounded-full border border-zinc-300 bg-background px-2 py-1 shadow-sm dark:border-zinc-700">
                <label htmlFor={inputId} className="sr-only">
                    جستجوی محصولات
                </label>
                <input
                    id={inputId}
                    type="search"
                    name="search"
                    defaultValue={defaultValue}
                    onChange={(event) => {
                        if (event.currentTarget.value === "") event.currentTarget.form?.requestSubmit();
                    }}
                    placeholder="جستجو در محصولات..."
                    className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-foreground placeholder:text-zinc-400 focus:outline-none"
                />
                <button
                    type="submit"
                    aria-label="جستجو"
                    className="shrink-0 rounded-full p-2 text-zinc-500 transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:text-zinc-400"
                >
                    <SearchIcon className="size-5" />
                </button>
            </div>
        </Form>
    );
}
