"use client";

import {useState} from "react";
import Image from "next/image";

export function ProductImage({images, name}: {images: string[]; name: string}) {
    const primaryImage = images[0];
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900">
            {primaryImage && !imageFailed ? (
                <Image
                    src={primaryImage}
                    alt={name}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    // Temporary: no real image storage exists yet, so there's no known domain to
                    // allowlist in next.config.ts. Once Phase 7 adds real upload/storage, add that
                    // origin to images.remotePatterns and drop this prop.
                    unoptimized
                    className="object-cover"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                    بدون تصویر
                </div>
            )}
        </div>
    );
}
