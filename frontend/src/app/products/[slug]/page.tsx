import type {Metadata} from "next";
import {getProductBySlug} from "@/lib/api/products";
import {ProductImage} from "@/components/product/ProductImage";
import {ProductInfo} from "@/components/product/ProductInfo";
import {ProductDetailsPanel} from "@/components/product/ProductDetailsPanel";

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
        <main className="mx-auto flex w-full max-w-[1536px] flex-1 flex-col px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
                    <ProductImage images={product.images} name={product.name} />
                    <ProductInfo product={product} />
                </div>
                <ProductDetailsPanel description={product.description} specifications={product.specifications} />
            </div>
        </main>
    );
}
