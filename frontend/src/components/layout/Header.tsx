import Link from "next/link";
import {Suspense} from "react";
import {ProductSearchForm} from "@/components/product/ProductSearchForm";
import {HeaderSearch} from "@/components/layout/HeaderSearch";
import {CartLink} from "@/components/cart/CartLink";

const SEARCH_CLASS_NAME = "flex min-w-60 flex-1";

export function Header() {
    return (
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-background dark:border-zinc-800">
            <div className="mx-auto flex w-full max-w-[1536px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-3">
                    <Link
                        href="/"
                        className="rounded text-lg font-bold hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        فروشگاه ابزار سفر
                    </Link>
                    {/* Reading the URL's search params needs a Suspense boundary so prerendered pages still build;
                        the fallback is the same form without the pre-filled term. */}
                    <Suspense fallback={<ProductSearchForm className={SEARCH_CLASS_NAME} />}>
                        <HeaderSearch className={SEARCH_CLASS_NAME} />
                    </Suspense>
                </div>
                <nav aria-label="ناوبری اصلی" className="flex items-center gap-4 text-sm">
                    <Link
                        href="/products"
                        className="rounded hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        محصولات
                    </Link>
                    <Link
                        href="/contact"
                        className="rounded hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        تماس با ما
                    </Link>
                    <CartLink />
                </nav>
            </div>
        </header>
    );
}
