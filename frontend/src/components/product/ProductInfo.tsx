import Link from "next/link";
import type {ProductDetail} from "@/lib/api/types";
import {VariantSelector} from "@/components/VariantSelector";

export function ProductInfo({product}: {product: ProductDetail}) {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="text-sm text-zinc-500">
                    <Link
                        href={`/categories/${product.categorySlug}`}
                        className="rounded hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        {product.categoryName}
                    </Link>
                </p>
                <h1 className="text-2xl font-bold">{product.name}</h1>
                <p className="text-zinc-600 dark:text-zinc-400">{product.shortDescription}</p>
            </div>
            {product.variants.length === 0 ? (
                <p className="text-zinc-500">در حال حاضر این محصول موجود نیست.</p>
            ) : (
                <VariantSelector variants={product.variants} productName={product.name} />
            )}
        </div>
    );
}
