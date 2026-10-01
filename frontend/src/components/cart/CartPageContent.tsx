"use client";

import {useState} from "react";
import Link from "next/link";
import {useCart} from "@/components/cart/CartProvider";
import {CartError} from "@/lib/api/cart";
import {formatPrice} from "@/lib/format";
import type {CartItem} from "@/lib/api/types";

function errorMessage(err: unknown): string {
    return err instanceof CartError ? err.message : "خطایی رخ داد.";
}

function CartItemRow({
    item,
    disabled,
    onUpdateQuantity,
    onRemove,
}: {
    item: CartItem;
    disabled: boolean;
    onUpdateQuantity: (itemId: number, quantity: number) => Promise<void>;
    onRemove: (itemId: number) => Promise<void>;
}) {
    const [rowError, setRowError] = useState<string | null>(null);
    const attributeEntries = Object.entries(item.attributes);

    async function handleQuantityChange(quantity: number) {
        setRowError(null);
        try {
            await onUpdateQuantity(item.id, quantity);
        } catch (err) {
            setRowError(errorMessage(err));
        }
    }

    async function handleRemove() {
        setRowError(null);
        try {
            await onRemove(item.id);
        } catch (err) {
            setRowError(errorMessage(err));
        }
    }

    return (
        <li className="flex flex-col gap-2 border-b border-zinc-200 py-4 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-semibold">{item.productName}</p>
                    {attributeEntries.length > 0 && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {attributeEntries.map(([key, value]) => `${key}: ${value}`).join("، ")}
                        </p>
                    )}
                </div>
                <div className="whitespace-nowrap text-end">
                    <p className="font-medium">{formatPrice(item.totalPrice)}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatPrice(item.unitPrice)} / عدد</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-label={`کاهش تعداد ${item.productName}`}
                        disabled={disabled || item.quantity <= 1}
                        onClick={() => handleQuantityChange(item.quantity - 1)}
                        className="flex size-7 items-center justify-center rounded border border-zinc-300 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                        −
                    </button>
                    <span aria-live="polite" className="min-w-6 text-center">
                        {item.quantity.toLocaleString("fa-IR")}
                    </span>
                    <button
                        type="button"
                        aria-label={`افزایش تعداد ${item.productName}`}
                        disabled={disabled}
                        onClick={() => handleQuantityChange(item.quantity + 1)}
                        className="flex size-7 items-center justify-center rounded border border-zinc-300 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                        +
                    </button>
                </div>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={handleRemove}
                    className="rounded text-sm text-zinc-500 hover:text-accent disabled:opacity-40"
                >
                    حذف
                </button>
            </div>
            {rowError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {rowError}
                </p>
            )}
        </li>
    );
}

export function CartPageContent() {
    const {cart, isLoading, isMutating, error, updateQuantity, removeItem, refresh} = useCart();

    if (isLoading) {
        return <p className="text-zinc-500 dark:text-zinc-400">در حال بارگذاری سبد خرید...</p>;
    }

    // `error` also carries mutation failures (set by CartProvider's runMutation), but those are shown
    // per-row via each CartItemRow's own local state instead. This branch only ever matters for a
    // genuine initial-load failure: a mutation failure can't reach it, since cart.items is only ever
    // empty here from the initial state or from a successful removal, both of which clear `error`.
    if (error && cart.items.length === 0) {
        return (
            <div className="flex flex-col items-start gap-3 text-zinc-500 dark:text-zinc-400">
                <p>{error}</p>
                <button
                    type="button"
                    onClick={() => void refresh()}
                    className="rounded-full bg-accent px-5 py-2 text-accent-foreground hover:bg-accent-hover"
                >
                    تلاش دوباره
                </button>
            </div>
        );
    }

    if (cart.items.length === 0) {
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

    return (
        <div className="flex flex-col gap-4">
            <ul className="flex flex-col">
                {cart.items.map((item) => (
                    <CartItemRow
                        key={item.id}
                        item={item}
                        disabled={isMutating}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeItem}
                    />
                ))}
            </ul>
            <div className="flex items-center justify-between border-t border-zinc-200 pt-4 font-semibold dark:border-zinc-800">
                <span>جمع کل</span>
                <span>{formatPrice(cart.totalPrice)}</span>
            </div>
        </div>
    );
}
