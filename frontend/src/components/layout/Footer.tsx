import Link from "next/link";
import {TelegramIcon} from "@/components/TelegramIcon";

export function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 text-sm text-zinc-600 dark:text-zinc-400 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                    <Link
                        href="/"
                        className="rounded font-semibold text-foreground hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        فروشگاه ابزار سفر
                    </Link>
                    <p>لوازم کمپینگ، سفر و طبیعت‌گردی</p>
                </div>
                <nav aria-label="ناوبری فوتر" className="flex flex-col gap-2">
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
                <div className="flex flex-col gap-2">
                    <span className="font-semibold text-foreground">ما را دنبال کنید</span>
                    <a
                        href="https://t.me/abzarsafar62"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="تلگرام"
                        className="w-fit rounded hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        <TelegramIcon className="h-6 w-6 fill-current" />
                    </a>
                </div>
            </div>
            <div className="border-t border-zinc-200 p-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
                © {year} فروشگاه ابزار سفر
            </div>
        </footer>
    );
}
