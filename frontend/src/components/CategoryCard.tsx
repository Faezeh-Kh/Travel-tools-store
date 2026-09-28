"use client";

import {useState} from "react";
import Image from "next/image";
import Link from "next/link";
import type {Category} from "@/lib/api/types";

export function CategoryCard({category}: {category: Category}) {
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <Link
            href={`/categories/${category.slug}`}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:border-zinc-800 dark:hover:border-zinc-600"
        >
            {category.imageUrl && !imageFailed ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900">
                    <Image
                        src={category.imageUrl}
                        alt={category.name}
                        fill
                        sizes="(min-width: 640px) 33vw, 50vw"
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
            <h2 className="font-semibold">{category.name}</h2>
            <p className="line-clamp-2 min-h-10 text-sm text-zinc-600 dark:text-zinc-400">{category.description}</p>
        </Link>
    );
}
