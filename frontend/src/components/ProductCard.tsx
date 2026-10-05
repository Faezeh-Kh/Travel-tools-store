"use client";

import {useState} from "react";
import Image from "next/image";
import Link from "next/link";
import type {ProductSummary} from "@/lib/api/types";
import {formatPriceRange} from "@/lib/format";

export function ProductCard({product}: {product: ProductSummary}) {
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <Link
            href={`/products/${product.slug}`}
            className="flex h-full flex-col gap-2 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:border-zinc-800 dark:hover:border-zinc-600"
        >
            {product.primaryImage && !imageFailed ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900">
                    <Image
                        src={product.primaryImage}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        // Temporary: no real image storage exists yet, so there's no known domain to
                        // allowlist in next.config.ts. Once Phase 7 adds real upload/storage, add that
                        // origin to images.remotePatterns and drop this prop.
                        unoptimized
                        className="object-cover"
                        onError={() => setImageFailed(true)}
                    />
                </div>
            ) : (
                <div className="flex aspect-square items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-900">
                    بدون تصویر
                </div>
            )}
            {/* Line limits (title 2, description 1) keep cards compact; h-full makes every card in a grid row
                equally tall, and mt-auto pins the price to the bottom. text-end puts it in the bottom-left corner in
                RTL (bottom-right in LTR). */}
            <h2 className="line-clamp-2 font-semibold">{product.name}</h2>
            <p className="line-clamp-1 text-sm text-zinc-600 dark:text-zinc-400">{product.shortDescription}</p>
            <p className="mt-auto line-clamp-2 text-end font-medium">
                {formatPriceRange(product.minPrice, product.maxPrice)}
            </p>
        </Link>
    );
}
