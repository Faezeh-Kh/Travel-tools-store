"use client";

import {useState} from "react";
import Image from "next/image";
import {ChevronIcon} from "@/components/icons/ChevronIcon";

// Main photo plus, when the product has more than one, previous/next arrows and a row of thumbnail buttons.
// The state lives here; MainImage and Thumbnails below only render what they're given.
export function ProductGallery({images, name}: {images: string[]; name: string}) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    // Tracked per URL, so one broken file doesn't hide the product's other photos.
    const [failedImages, setFailedImages] = useState<string[]>([]);
    const markFailed = (image: string) => setFailedImages((failed) => [...failed, image]);
    const imageCount = images.length;
    // Modulo arithmetic wraps from the last photo to the first and back, like the home page HeroBanner.
    const showPrevious = () => setSelectedIndex((index) => (index - 1 + imageCount) % imageCount);
    const showNext = () => setSelectedIndex((index) => (index + 1) % imageCount);

    return (
        // Phones: thumbnails in a row below the photo. From sm up: a column beside it. In RTL a row runs right to
        // left, so flex-row-reverse puts the thumbnails (second in the markup) on the right, while the markup keeps
        // the photo first for screen readers and Tab order.
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <MainImage
                image={images[selectedIndex]}
                name={name}
                failedImages={failedImages}
                onError={markFailed}
                // No arrows for a single photo: there's nowhere to step to.
                onPrevious={imageCount > 1 ? showPrevious : undefined}
                onNext={imageCount > 1 ? showNext : undefined}
            />
            {imageCount > 1 && (
                <Thumbnails
                    images={images}
                    selectedIndex={selectedIndex}
                    failedImages={failedImages}
                    onSelect={setSelectedIndex}
                    onError={markFailed}
                />
            )}
        </div>
    );
}

const ARROW_BUTTON =
    "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function MainImage({
    image,
    name,
    failedImages,
    onError,
    onPrevious,
    onNext,
}: {
    image: string | undefined;
    name: string;
    failedImages: string[];
    onError: (image: string) => void;
    onPrevious?: () => void;
    onNext?: () => void;
}) {
    return (
        // Product photos come in many shapes (portrait to landscape), so the whole photo is fitted into a square
        // frame (object-contain) instead of filling it and cropping the product away (object-cover).
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900">
            {image && !failedImages.includes(image) ? (
                <Image
                    // A new key per photo makes React mount a fresh <img> instead of reusing the previous one.
                    key={image}
                    src={image}
                    alt={name}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    // Temporary: no real image storage exists yet, so there's no known domain to
                    // allowlist in next.config.ts. Once Phase 7 adds real upload/storage, add that
                    // origin to images.remotePatterns and drop this prop.
                    unoptimized
                    className="object-contain"
                    onError={() => onError(image)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                    بدون تصویر
                </div>
            )}
            {/* Always visible rather than on hover, so they also work on touch screens. In RTL "previous" sits
                at the start (right) edge pointing right, matching the HeroBanner arrows. */}
            {onPrevious && (
                <button type="button" onClick={onPrevious} aria-label="تصویر قبلی" className={`start-2 ${ARROW_BUTTON}`}>
                    <ChevronIcon direction="right" className="size-5" />
                </button>
            )}
            {onNext && (
                <button type="button" onClick={onNext} aria-label="تصویر بعدی" className={`end-2 ${ARROW_BUTTON}`}>
                    <ChevronIcon direction="left" className="size-5" />
                </button>
            )}
        </div>
    );
}

function Thumbnails({
    images,
    selectedIndex,
    failedImages,
    onSelect,
    onError,
}: {
    images: string[];
    selectedIndex: number;
    failedImages: string[];
    onSelect: (index: number) => void;
    onError: (image: string) => void;
}) {
    return (
        // From sm up the column is capped to the photo's height: the list is absolutely positioned inside the
        // wrapper, so it adds nothing to the row's height (the square photo sets it) and scrolls when it's taller.
        // The padding leaves room for the focus outline, which the scroll container would otherwise clip.
        <div className="relative shrink-0 sm:w-20">
            <ul className="flex list-none flex-wrap gap-2 sm:absolute sm:inset-0 sm:flex-col sm:flex-nowrap sm:overflow-x-hidden sm:overflow-y-auto sm:p-1 sm:[scrollbar-width:thin]">
                {images.map((image, index) => (
                    <li key={image}>
                        <button
                            type="button"
                            onClick={() => onSelect(index)}
                            aria-label={`نمایش تصویر ${(index + 1).toLocaleString("fa-IR")} از ${images.length.toLocaleString("fa-IR")}`}
                            aria-current={index === selectedIndex}
                            className={`relative block size-16 overflow-hidden sm:aspect-square sm:h-auto sm:w-full rounded-md border-2 bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-zinc-900 ${
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
                                    sizes="80px"
                                    unoptimized
                                    className="object-contain"
                                    onError={() => onError(image)}
                                />
                            )}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
