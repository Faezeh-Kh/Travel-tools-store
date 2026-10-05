import type {ProductSummary} from "@/lib/api/types";
import {ProductCard} from "@/components/ProductCard";
import {CtaLink} from "@/components/CtaLink";

export function ProductsSection({products}: {products: ProductSummary[]}) {
    return (
        <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto flex w-full max-w-[1536px] flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
                <h2 className="w-fit border-b-2 border-accent pb-2 text-2xl font-bold">محصولات</h2>
                {products.length === 0 ? (
                    <p className="text-zinc-500">در حال حاضر محصولی برای نمایش وجود ندارد.</p>
                ) : (
                    <>
                        {/* No 5-column step: the home page shows 12 products (see FEATURED_PRODUCT_COUNT), and
                            12 only fills rows of 2, 3, 4 or 6. */}
                        <ul className="grid list-none grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                            {products.map((product) => (
                                <li key={product.id}>
                                    <ProductCard product={product} />
                                </li>
                            ))}
                        </ul>
                        <CtaLink href="/products" className="self-center">
                            مشاهده همه محصولات
                        </CtaLink>
                    </>
                )}
            </div>
        </section>
    );
}
