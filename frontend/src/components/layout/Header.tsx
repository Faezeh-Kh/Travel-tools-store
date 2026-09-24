import Link from "next/link";

export function Header() {
    return (
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-background dark:border-zinc-800">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 p-4">
                <Link
                    href="/"
                    className="rounded text-lg font-bold hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    فروشگاه ابزار سفر
                </Link>
                <nav aria-label="ناوبری اصلی" className="flex items-center gap-4 text-sm">
                    <Link
                        href="/"
                        className="rounded hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        خانه
                    </Link>
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
                </nav>
            </div>
        </header>
    );
}
