import Link from "next/link";
import {getPaginationRange} from "@/lib/getPaginationRange";
import {buildProductSearchQueryString} from "@/lib/parseProductSearchParams";
import type {ProductSearchParams} from "@/lib/api/types";

function pageHref(basePath: string, searchParams: ProductSearchParams, page: number): string {
    return `${basePath}${buildProductSearchQueryString({...searchParams, page})}`;
}

export function Pagination({
    currentPage,
    totalPages,
    searchParams,
    basePath = "/products",
}: {
    currentPage: number;
    totalPages: number;
    searchParams: ProductSearchParams;
    basePath?: string;
}) {
    const range = getPaginationRange(currentPage, totalPages);

    if (range.length === 0) return null;

    return (
        <nav aria-label="صفحه‌بندی محصولات" className="flex flex-wrap items-center justify-center gap-2">
            {currentPage > 0 && (
                <Link href={pageHref(basePath, searchParams, currentPage - 1)} className="rounded-md px-3 py-1.5 text-sm text-accent hover:underline">
                    صفحه قبل
                </Link>
            )}

            {range.map((item, index) =>
                item === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-zinc-400">
                        …
                    </span>
                ) : (
                    <Link
                        key={item}
                        href={pageHref(basePath, searchParams, item)}
                        aria-current={item === currentPage ? "page" : undefined}
                        className={
                            item === currentPage
                                ? "rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
                                : "rounded-md px-3 py-1.5 text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }
                    >
                        {item + 1}
                    </Link>
                ),
            )}

            {currentPage < totalPages - 1 && (
                <Link href={pageHref(basePath, searchParams, currentPage + 1)} className="rounded-md px-3 py-1.5 text-sm text-accent hover:underline">
                    صفحه بعد
                </Link>
            )}
        </nav>
    );
}
