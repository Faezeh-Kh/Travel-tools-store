import type {Metadata} from "next";
import {CheckoutPageContent} from "@/components/checkout/CheckoutPageContent";

// noindex: a checkout page has no content of its own worth showing in search results.
export const metadata: Metadata = {
    title: "تکمیل خرید",
    description: "ثبت اطلاعات تماس و نشانی برای ثبت سفارش.",
    robots: {index: false, follow: false},
};

export default function CheckoutPage() {
    return (
        <main className="mx-auto flex w-full max-w-[1536px] flex-1 flex-col px-4 pt-4 pb-8 sm:px-6 lg:px-8 lg:pt-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                <h1 className="text-2xl font-bold">تکمیل خرید</h1>
                <CheckoutPageContent />
            </div>
        </main>
    );
}
