"use client";

import Link from "next/link";
import {useCart} from "@/components/cart/CartProvider";

export function CartLink() {
    const {cart} = useCart();
    const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

    return (
        <Link
            href="/cart"
            aria-label={itemCount > 0 ? `سبد خرید (${itemCount.toLocaleString("fa-IR")} کالا)` : "سبد خرید"}
            className="relative flex items-center rounded p-1 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
                aria-hidden="true"
            >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {itemCount > 0 && (
                <span
                    aria-hidden="true"
                    className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground"
                >
                    {itemCount.toLocaleString("fa-IR")}
                </span>
            )}
        </Link>
    );
}
