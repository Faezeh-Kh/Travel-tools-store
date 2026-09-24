import type {Metadata} from "next";
import {TelegramIcon} from "@/components/TelegramIcon";

export const metadata: Metadata = {
    title: "تماس با ما",
    description: "اطلاعات تماس فروشگاه ابزار سفر: آدرس، شماره تماس و ایمیل.",
};

export default function ContactPage() {
    return (
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
            <h1 className="text-2xl font-bold">تماس با ما</h1>
            <address className="flex flex-col gap-3 not-italic text-zinc-600 dark:text-zinc-400">
                <p>سمنان، شاهرود، میدان امام، پاساژ ونوس، طبقه سوم</p>
                <a
                    href="tel:+989307350368"
                    dir="ltr"
                    className="w-fit rounded text-end hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    +98 930 735 0368
                </a>
                <a
                    href="mailto:khorram.faezeh@gmail.com"
                    dir="ltr"
                    className="w-fit rounded text-end hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    khorram.faezeh@gmail.com
                </a>
                <a
                    href="https://t.me/abzarsafar62"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-fit items-center gap-2 rounded hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    <TelegramIcon className="h-5 w-5 fill-current" />
                    تلگرام
                </a>
            </address>
        </main>
    );
}
