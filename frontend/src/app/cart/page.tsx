import type {Metadata} from "next";
import {CartPageContent} from "@/components/cart/CartPageContent";

export const metadata: Metadata = {
    title: "سبد خرید",
    description: "مشاهده و ویرایش سبد خرید شما.",
};

export default function CartPage() {
    return (
        <main className="mx-auto flex w-full max-w-[1536px] flex-1 flex-col px-4 pt-4 pb-8 sm:px-6 lg:px-8 lg:pt-6">
            <div className="flex w-full max-w-4xl flex-col gap-4">
                <h1 className="text-2xl font-bold">سبد خرید</h1>
                <CartPageContent />
            </div>
        </main>
    );
}
