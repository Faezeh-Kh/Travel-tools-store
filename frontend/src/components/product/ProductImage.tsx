"use client";

import {useState} from "react";
import Image from "next/image";

// Main photo plus, when the product has more than one, a row of thumbnail buttons that switch it.
export function ProductImage({images, name}: {images: string[]; name: string}) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    // Tracked per URL, so one broken file doesn't hide the product's other photos.
    const [failedImages, setFailedImages] = useState<string[]>([]);
    const selectedImage = images[selectedIndex];
    const markFailed = (image: string) => setFailedImages((failed) => [...failed, image]);

    return (
        <div className="flex flex-col gap-3">
            {/* Product photos come in many shapes (portrait to landscape), so the whole photo is fitted into a
                square frame (object-contain) instead of filling it and cropping the product away (object-cover). */}
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900">
                {selectedImage && !failedImages.includes(selectedImage) ? (
                    <Image
                        // A new key per photo makes React mount a fresh <img> instead of reusing the previous one.
                        key={selectedImage}
                        src={selectedImage}
                        alt={name}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        // Temporary: no real image storage exists yet, so there's no known domain to
                        // allowlist in next.config.ts. Once Phase 7 adds real upload/storage, add that
                        // origin to images.remotePatterns and drop this prop.
                        unoptimized
                        className="object-contain"
                        onError={() => markFailed(selectedImage)}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                        بدون تصویر
                    </div>
                )}
            </div>
            {images.length > 1 && (
                <ul className="flex list-none flex-wrap gap-2">
                    {images.map((image, index) => (
                        <li key={image}>
                            <button
                                type="button"
                                onClick={() => setSelectedIndex(index)}
                                aria-label={`نمایش تصویر ${(index + 1).toLocaleString("fa-IR")} از ${images.length.toLocaleString("fa-IR")}`}
                                aria-current={index === selectedIndex}
                                className={`relative block size-16 overflow-hidden rounded-md border-2 bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-zinc-900 ${
                                    index === selectedIndex
                                        ? "border-accent"
                                        : "border-transparent hover:border-zinc-400 dark:hover:border-zinc-600"
                                }`}
                            >
                                {!failedImages.includes(image) && (
                                    <Image
                                        src={image}
                                        // Decorative: the button's aria-label already says what it does.
                                        alt=""
                                        fill
                                        sizes="64px"
                                        unoptimized
                                        className="object-contain"
                                        onError={() => markFailed(image)}
                                    />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
