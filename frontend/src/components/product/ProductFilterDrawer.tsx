"use client";

import {useRef, useState, type ReactNode} from "react";
import {CloseIcon} from "@/components/icons/CloseIcon";
import {FilterIcon} from "@/components/icons/FilterIcon";

/**
 * Filter button plus a modal drawer for screens below `lg`, where the filter sidebar is hidden.
 * A native <dialog> opened with showModal() provides focus containment, Esc to close, an inert background,
 * and a backdrop without a UI library. showModal() is a DOM method, which is why this is a Client Component.
 */
export function ProductFilterDrawer({activeFilterCount, children}: {activeFilterCount: number; children: ReactNode}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    // Changing this key rebuilds the drawer's content, which resets its uncontrolled inputs to the applied
    // (URL) values; done on every close so choices that were not applied are discarded.
    const [contentKey, setContentKey] = useState(0);
    const close = () => dialogRef.current?.close();

    return (
        <>
            <button
                type="button"
                onClick={() => dialogRef.current?.showModal()}
                className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden dark:border-zinc-700"
            >
                <FilterIcon className="size-4" />
                فیلترها
                {activeFilterCount > 0 && ` (${activeFilterCount.toLocaleString("fa-IR")})`}
            </button>
            {/* The submit event bubbles up from the filter form inside, so applying or clearing the filters closes
                the drawer right away instead of after the next page arrives. onClose fires for every way of
                closing (the close button, Esc, or applying). */}
            <dialog
                ref={dialogRef}
                aria-label="فیلتر محصولات"
                onSubmit={close}
                onClose={() => setContentKey((key) => key + 1)}
                className="m-0 me-auto h-dvh max-h-none w-80 max-w-[85vw] overflow-y-auto bg-background p-4 text-foreground backdrop:bg-black/50"
            >
                <button
                    type="button"
                    onClick={close}
                    aria-label="بستن"
                    className="absolute end-3 top-3 rounded-full p-1 text-zinc-500 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    <CloseIcon className="size-5" />
                </button>
                <div key={contentKey}>{children}</div>
            </dialog>
        </>
    );
}
