import type {Metadata} from "next";
import {getProductBySlug} from "@/lib/api/products";
import {ProductImage} from "@/components/product/ProductImage";
import {ProductInfo} from "@/components/product/ProductInfo";

export async function generateMetadata({params}: PageProps<"/products/[slug]">): Promise<Metadata> {
    const {slug} = await params;
    const product = await getProductBySlug(slug);

    return {
        title: product.name,
        description: product.shortDescription,
    };
}

export default async function ProductDetailPage({params}: PageProps<"/products/[slug]">) {
    const {slug} = await params;
    const product = await getProductBySlug(slug);

    return (
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
                <ProductImage images={product.images} name={product.name} />
                <ProductInfo product={product} />
            </div>

            {product.description && (
                <section>
                    <h2 className="text-2xl font-bold">توضیحات</h2>
                    <p className="mt-4 text-zinc-600 dark:text-zinc-400">{product.description}</p>
                </section>
            )}

            {Object.keys(product.specifications).length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold">مشخصات</h2>
                    <dl className="mt-4 flex flex-col gap-1">
                        {Object.entries(product.specifications).map(([key, value]) => (
                            <div key={key} className="flex gap-2 text-sm">
                                <dt className="text-zinc-500">{key}:</dt>
                                <dd>{value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            )}
        </main>
    );
}
