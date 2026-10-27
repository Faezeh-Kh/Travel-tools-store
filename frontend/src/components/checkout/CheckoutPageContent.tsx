"use client";

import {useState} from "react";
import {useCart} from "@/components/cart/CartProvider";
import {CartLoadError} from "@/components/cart/CartLoadError";
import {EmptyCart} from "@/components/cart/EmptyCart";
import {CheckoutForm} from "@/components/checkout/CheckoutForm";
import {formatPrice} from "@/lib/format";
import type {Cart} from "@/lib/api/types";

// What is about to be ordered, from the cart this tab holds. Only a preview: the backend prices the order
// again when it is placed, so the amounts on the confirmation page are the final ones.
function CheckoutSummary({cart}: {cart: Cart}) {
    return (
        <section aria-labelledby="checkout-summary-heading"
                 className="flex flex-col gap-3 rounded-2xl bg-zinc-50 p-5 lg:sticky lg:top-24 dark:bg-zinc-900">
            <h2 id="checkout-summary-heading" className="font-semibold">خلاصه سفارش</h2>
            <ul className="flex flex-col gap-2 text-sm">
                {cart.items.map((item) => {
                    const attributeEntries = Object.entries(item.attributes);
                    return (
                        <li key={item.id} className="flex items-start justify-between gap-3">
                            {/* min-w-0: a flex item won't shrink below its content's width by default, so a long
                                name would push the price out of place; with it, the name wraps instead
                                (break-words also breaks a single over-long word). */}
                            <div className="min-w-0 break-words">
                                <p>
                                    {item.productName}
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                        {" "}× {item.quantity.toLocaleString("fa-IR")}
                                    </span>
                                </p>
                                {/* Same "key: value" format as the cart page. */}
                                {attributeEntries.length > 0 && (
                                    <p className="text-zinc-500 dark:text-zinc-400">
                                        {attributeEntries.map(([key, value]) => `${key}: ${value}`).join("، ")}
                                    </p>
                                )}
                            </div>
                            <span className="shrink-0 whitespace-nowrap">{formatPrice(item.totalPrice)}</span>
                        </li>
                    );
                })}
            </ul>
            <div className="flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">جمع کل</span>
                <span className="text-lg font-bold">{formatPrice(cart.totalPrice)}</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                قیمت و موجودی هنگام ثبت سفارش دوباره بررسی می‌شود و مبلغ نهایی در صفحه تأیید سفارش نمایش داده
                می‌شود.
            </p>
        </section>
    );
}

export function CheckoutPageContent() {
    const {cart, isLoading, loadError, refresh} = useCart();
    // Set once the order exists. From then on the page only says it is moving on: the cart is refreshed
    // (now empty) while the confirmation page loads, and that must not show as "your cart is empty".
    const [orderPlaced, setOrderPlaced] = useState(false);

    if (orderPlaced) {
        return (
            <p role="status" className="text-zinc-500 dark:text-zinc-400">
                سفارش شما ثبت شد. در حال انتقال به صفحه تأیید سفارش...
            </p>
        );
    }

    // Checked before isLoading/loadError on purpose: items only exist once a load succeeded, and a later
    // refresh (the form runs one when the cart changed under it) keeps the current cart while it loads or
    // if it fails. Showing the form throughout keeps what the shopper typed and the form's error message,
    // instead of swapping the form out for a loading or error state.
    if (cart.items.length > 0) {
        return (
            // The summary comes first in the page, so on a phone the shopper sees what they are ordering before
            // the form and its submit button. On wide screens the grid places it in the second column instead.
            // The form keeps at least the width it had before (34.5rem at lg, where the page is 60rem wide after
            // its padding); from xl the full max-w-5xl fits, so the wider 26rem summary still leaves it 36.5rem.
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_24rem] xl:grid-cols-[1fr_26rem]">
                <div className="lg:col-start-2 lg:row-start-1">
                    <CheckoutSummary cart={cart} />
                </div>
                <div className="lg:col-start-1 lg:row-start-1">
                    <CheckoutForm onOrderPlaced={() => setOrderPlaced(true)} />
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <p className="text-zinc-500 dark:text-zinc-400">در حال بارگذاری سبد خرید...</p>;
    }

    if (loadError) {
        return <CartLoadError message={loadError} onRetry={() => void refresh()} />;
    }

    return <EmptyCart />;
}
