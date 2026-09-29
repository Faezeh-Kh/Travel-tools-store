import {Suspense} from "react";
import {getCategories} from "@/lib/api/categories";
import {getProducts, PAGE_SIZE} from "@/lib/api/products";
import {ProductCard} from "@/components/ProductCard";
import {ProductFilters} from "@/components/product/ProductFilters";
import {ProductSortSelect} from "@/components/product/ProductSortSelect";
import {Pagination} from "@/components/product/Pagination";
import {CtaLink} from "@/components/CtaLink";
import {parseProductSearchParams} from "@/lib/parseProductSearchParams";
import type {ProductSearchParams} from "@/lib/api/types";

function buildNoResultsMessage(search?: string, categoryName?: string): string {
    if (search && categoryName) return `هیچ محصولی برای «${search}» در دسته «${categoryName}» پیدا نشد.`;
    if (search) return `هیچ محصولی برای «${search}» پیدا نشد.`;
    if (categoryName) return `هیچ محصولی در دسته «${categoryName}» پیدا نشد.`;
    return "هیچ محصولی با این فیلترها پیدا نشد.";
}

async function ProductResults({params, categoryName}: {params: ProductSearchParams; categoryName?: string}) {
    const {items: products, page, totalPages, totalElements} = await getProducts({...params, size: PAGE_SIZE});
    const hasActiveFilters = Boolean(params.search || params.category || params.inStock);

    if (products.length === 0) {
        return hasActiveFilters ? (
            <div className="flex flex-col items-start gap-3 text-zinc-500">
                <p>{buildNoResultsMessage(params.search, categoryName)}</p>
                <CtaLink href="/products">پاک کردن فیلترها</CtaLink>
            </div>
        ) : (
            <p className="text-zinc-500">در حال حاضر محصولی برای نمایش وجود ندارد.</p>
        );
    }

    return (
        <>
            <p className="text-sm text-zinc-500">{totalElements.toLocaleString("fa-IR")} محصول</p>
            <ul className="grid list-none grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {products.map((product) => (
                    <li key={product.id}>
                        <ProductCard product={product}/>
                    </li>
                ))}
            </ul>
            <Pagination currentPage={page} totalPages={totalPages} searchParams={params}/>
        </>
    );
}

export default async function ProductsPage({searchParams}: PageProps<"/products">) {
    const params = parseProductSearchParams(await searchParams);
    const categories = await getCategories();
    const categoryName = categories.find((category) => category.slug === params.category)?.name;
    // Remounts the forms after navigation so their uncontrolled inputs pick up the new URL values.
    const filtersKey = `${params.search ?? ""}|${params.category ?? ""}|${params.sort ?? ""}|${params.inStock ?? false}`;

    return (
        <main className="mx-auto w-full max-w-[1536px] flex-1 px-4 pt-4 pb-8 sm:px-6 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8 lg:px-8 lg:pt-6">
            {/* First in the markup, so in RTL it sits on the right. The bordered box stretches to the full height
                of the row, while the filters inside it stay sticky below the sticky header. (A box as tall as its
                row has no room to slide, so the sticky part has to be the inner element.) */}
            <aside
                aria-label="فیلتر محصولات"
                className="mb-4 rounded-lg border border-zinc-200 p-4 lg:mb-0 dark:border-zinc-800"
            >
                <div className="lg:sticky lg:top-24">
                    <ProductFilters key={filtersKey} categories={categories} defaultValues={params}/>
                </div>
            </aside>
            <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold">محصولات</h1>
                    <ProductSortSelect key={filtersKey} defaultValues={params}/>
                </div>
                {/* A new key per URL makes React show the fallback while the new results load, instead of
                    replacing the whole page; the sidebar and toolbar stay in place. */}
                <Suspense
                    key={`${filtersKey}|${params.page ?? 0}`}
                    fallback={<p className="text-zinc-500">در حال بارگذاری محصولات...</p>}
                >
                    <ProductResults params={params} categoryName={categoryName}/>
                </Suspense>
            </div>
        </main>
    );
}
