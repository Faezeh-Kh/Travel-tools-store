"use client";

import {useState} from "react";
import Image from "next/image";
import Link from "next/link";

export const HERO_SLIDES = [
    {image: "/images/hero/hero-1.png", subtitle: "صبحی آرام کنار دریاچه، با چادر، فانوس و لوازم آشپزی سفری"},
    {image: "/images/hero/hero-2.png", subtitle: "کوله‌پشتی و باتوم مطمئن برای رسیدن به قله‌های برفی"},
    {image: "/images/hero/hero-3.png", subtitle: "از سواحل رنگی جنوب تا مسیرهای کوهستانی، با تجهیزات سبک و بادوام"},
    {image: "/images/hero/hero-4.png", subtitle: "کمپ بالای ابرها، با اجاق سفری، نقشه و هرآنچه در مسیر لازم دارید"},
    {image: "/images/hero/hero-5.png", subtitle: "سفر به دل کویر و تماشای حیات وحش، با تجهیزات آفرود و طبیعت‌گردی"},
    {image: "/images/hero/hero-6.png", subtitle: "شب‌های پرستاره کویر، کنار آتش و نور گرم فانوس"},
];

const CONTROL_FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-foreground";

function ChevronIcon({direction}: {direction: "left" | "right"}) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
            aria-hidden="true"
        >
            <polyline points={direction === "left" ? "15 6 9 12 15 18" : "9 6 15 12 9 18"} />
        </svg>
    );
}

export function HeroBanner() {
    const [current, setCurrent] = useState(0);
    const slideCount = HERO_SLIDES.length;

    // Modulo arithmetic wraps from the last slide to the first and back.
    const showPrevious = () => setCurrent((index) => (index - 1 + slideCount) % slideCount);
    const showNext = () => setCurrent((index) => (index + 1) % slideCount);

    return (
        <section className="relative isolate overflow-hidden text-accent-foreground">
            {/* All images are stacked and cross-faded with opacity; only the first is preloaded, the rest load
                with low priority. They are decorative (the subtitle carries the meaning), hence the empty alt. */}
            {HERO_SLIDES.map((slide, index) => (
                <Image
                    key={slide.image}
                    src={slide.image}
                    alt=""
                    fill
                    sizes="100vw"
                    preload={index === 0}
                    fetchPriority={index === 0 ? undefined : "low"}
                    className={`-z-20 object-cover transition-opacity duration-700 ${index === current ? "opacity-100" : "opacity-0"}`}
                />
            ))}
            {/* Dark green gradient from the right (the text side) so the white text stays readable over any image. */}
            <div className="absolute inset-0 -z-10 bg-linear-to-l from-green-950/90 via-green-950/70 to-green-950/30 sm:via-green-950/50 sm:to-transparent" />
            <div className="mx-auto flex min-h-[26rem] w-full max-w-[1536px] flex-col items-start justify-center px-4 py-16 sm:px-6 lg:min-h-[32rem] lg:px-8">
                <div className="flex max-w-xl flex-col items-start text-start">
                    <h1 className="text-3xl font-bold sm:text-4xl">تجهیزات سفر برای هر ماجراجویی</h1>
                    {/* aria-live lets screen readers announce the new subtitle after a slide change. */}
                    <p aria-live="polite" className="mt-4 min-h-[3.5rem] text-lg text-accent-foreground/90">
                        {HERO_SLIDES[current].subtitle}
                    </p>
                    <Link
                        href="/products"
                        className={`mt-6 text-sm text-accent-foreground/90 underline-offset-4 hover:underline ${CONTROL_FOCUS}`}
                    >
                        مشاهده همه محصولات
                    </Link>
                    {/* In RTL the row starts on the right, so "previous" (pointing right) comes first. */}
                    <div className="mt-8 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={showPrevious}
                            aria-label="تصویر قبلی"
                            className={`rounded-full bg-black/30 p-2 transition-colors hover:bg-black/50 ${CONTROL_FOCUS}`}
                        >
                            <ChevronIcon direction="right" />
                        </button>
                        <div className="flex items-center">
                            {HERO_SLIDES.map((slide, index) => (
                                // The padding gives each small dot a comfortable click/tap target.
                                <button
                                    key={slide.image}
                                    type="button"
                                    onClick={() => setCurrent(index)}
                                    aria-label={`تصویر ${(index + 1).toLocaleString("fa-IR")}`}
                                    aria-current={index === current ? "true" : undefined}
                                    className={`group rounded-full p-2 ${CONTROL_FOCUS}`}
                                >
                                    <span
                                        className={`block size-2.5 rounded-full transition-colors ${index === current ? "bg-accent-foreground" : "bg-accent-foreground/40 group-hover:bg-accent-foreground/70"}`}
                                    />
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={showNext}
                            aria-label="تصویر بعدی"
                            className={`rounded-full bg-black/30 p-2 transition-colors hover:bg-black/50 ${CONTROL_FOCUS}`}
                        >
                            <ChevronIcon direction="left" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
