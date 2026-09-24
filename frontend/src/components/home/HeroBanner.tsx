import Link from "next/link";

export function HeroBanner() {
    return (
        <section className="bg-linear-to-l from-accent to-accent-hover px-4 py-16 text-center text-accent-foreground sm:px-8">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
                <h1 className="text-3xl font-bold sm:text-4xl">
                    تجهیزات کمپینگ و سفر، برای هر ماجراجویی
                </h1>
                <p className="text-lg text-accent-foreground/90">
                    مجموعه‌ای منتخب از لوازم کمپینگ، سفر و طبیعت‌گردی با کیفیت مطمئن
                </p>
                <Link
                    href="/products"
                    className="w-fit rounded-full bg-background px-6 py-3 font-medium text-accent transition-colors hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-foreground dark:hover:bg-zinc-900"
                >
                    مشاهده محصولات
                </Link>
            </div>
        </section>
    );
}
