import {getCategories} from "@/lib/api/categories";
import {getProducts, PAGE_SIZE} from "@/lib/api/products";
import {ProductCard} from "@/components/ProductCard";
import {ProductFilterBar} from "@/components/product/ProductFilterBar";
import {Pagination} from "@/components/product/Pagination";
import {CtaLink} from "@/components/CtaLink";
import {parseProductSearchParams} from "@/lib/parseProductSearchParams";

function buildNoResultsMessage(search?: string, categoryName?: string): string {
    if (search && categoryName) return `هیچ محصولی برای «${search}» در دسته «${categoryName}» پیدا نشد.`;
    if (search) return `هیچ محصولی برای «${search}» پیدا نشد.`;
    if (categoryName) return `هیچ محصولی در دسته «${categoryName}» پیدا نشد.`;
    return "هیچ محصولی با این فیلترها پیدا نشد.";
}

export default async function ProductsPage({searchParams}: PageProps<"/products">) {
    const params = parseProductSearchParams(await searchParams);
    const [{items: products, page, totalPages}, categories] = await Promise.all([
        getProducts({...params, size: PAGE_SIZE}),
        getCategories(),
    ]);
    const categoryName = categories.find((category) => category.slug === params.category)?.name;
    const hasActiveFilters = Boolean(params.search || params.category || params.inStock);

    return (
        <main className="mx-auto flex w-full max-w-[1536px] flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
            <h1 className="text-2xl font-bold">محصولات</h1>
            <ProductFilterBar
                key={`${params.search ?? ""}|${params.category ?? ""}|${params.sort ?? ""}|${params.inStock ?? false}`}
                categories={categories}
                defaultValues={params}
            />
            {products.length === 0 ? (
                hasActiveFilters ? (
                    <div className="flex flex-col items-start gap-3 text-zinc-500">
                        <p>{buildNoResultsMessage(params.search, categoryName)}</p>
                        <CtaLink href="/products">پاک کردن فیلترها</CtaLink>
                    </div>
                ) : (
                    <p className="text-zinc-500">در حال حاضر محصولی برای نمایش وجود ندارد.</p>
                )
            ) : (
                <ul className="grid list-none grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {products.map((product) => (
                        <li key={product.id}>
                            <ProductCard product={product}/>
                        </li>
                    ))}
                </ul>
            )}
            <Pagination currentPage={page} totalPages={totalPages} searchParams={params}/>
        </main>
    );
}
