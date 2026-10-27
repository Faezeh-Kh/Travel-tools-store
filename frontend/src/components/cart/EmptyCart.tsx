import Link from "next/link";

// Shown when the cart has no items, by the cart and checkout pages alike.
export function EmptyCart() {
    return (
        <div className="flex flex-col items-start gap-3 text-zinc-500 dark:text-zinc-400">
            <p>سبد خرید شما خالی است.</p>
            <Link
                href="/products"
                className="rounded-full bg-accent px-5 py-2 text-accent-foreground hover:bg-accent-hover"
            >
                مشاهده محصولات
            </Link>
        </div>
    );
}
