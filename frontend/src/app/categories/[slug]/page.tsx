import type {Metadata} from "next";
import {getCategoryBySlug} from "@/lib/api/categories";
import {getProducts, PAGE_SIZE} from "@/lib/api/products";
import {ProductCard} from "@/components/ProductCard";
import {Pagination} from "@/components/product/Pagination";
import {CtaLink} from "@/components/CtaLink";

export async function generateMetadata({params}: PageProps<"/categories/[slug]">): Promise<Metadata> {
    const {slug} = await params;
    const category = await getCategoryBySlug(slug);

    return {
        title: category.name,
        description: category.description,
    };
}

export default async function CategoryPage({params}: PageProps<"/categories/[slug]">) {
    const {slug} = await params;
    const [category, {items: products, page, totalPages}] = await Promise.all([
        getCategoryBySlug(slug),
        getProducts({category: slug, size: PAGE_SIZE}),
    ]);

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">{category.name}</h1>
                <p className="text-zinc-600 dark:text-zinc-400">{category.description}</p>
            </div>
            {products.length === 0 ? (
                <div className="flex flex-col items-start gap-3 text-zinc-500">
                    <p>این دسته‌بندی در حال حاضر محصولی ندارد.</p>
                    <CtaLink href="/products">مشاهده همه محصولات</CtaLink>
                </div>
            ) : (
                <>
                    <ul className="grid list-none grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {products.map((product) => (
                            <li key={product.id}>
                                <ProductCard product={product} />
                            </li>
                        ))}
                    </ul>
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        searchParams={{}}
                        basePath={`/categories/${slug}`}
                    />
                    <CtaLink href={`/products?category=${slug}`} className="self-start">
                        مشاهده و فیلتر همه محصولات این دسته
                    </CtaLink>
                </>
            )}
        </main>
    );
}
