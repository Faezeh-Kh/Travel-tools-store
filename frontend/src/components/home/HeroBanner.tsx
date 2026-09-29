import Link from "next/link";

export function HeroBanner() {
    return (
        <section className="bg-linear-to-l from-accent to-accent-hover px-4 py-16 text-center text-accent-foreground sm:px-8">
            <div className="mx-auto flex max-w-3xl flex-col items-center">
                <h1 className="text-3xl font-bold sm:text-4xl">
                    تجهیزات کمپینگ و سفر، برای هر ماجراجویی
                </h1>
                <p className="mt-4 text-lg text-accent-foreground/90">
                    مجموعه‌ای منتخب از لوازم کمپینگ، سفر و طبیعت‌گردی با کیفیت مطمئن
                </p>
                <Link
                    href="/products"
                    className="mt-8 text-sm text-accent-foreground/90 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-foreground"
                >
                    مشاهده همه محصولات
                </Link>
            </div>
        </section>
    );
}
