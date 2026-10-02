"use client";

import {useState} from "react";
import Link from "next/link";
import {useCart} from "@/components/cart/CartProvider";
import {cartErrorMessage} from "@/lib/cartErrorMessages";
import {formatPrice} from "@/lib/format";
import {TrashIcon} from "@/components/icons/TrashIcon";
import {ErrorAlert} from "@/components/ErrorAlert";
import type {CartItem} from "@/lib/api/types";

const STEPPER_BUTTON_CLASS_NAME =
    "flex size-7 items-center justify-center rounded border border-zinc-300 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800";

function QuantityStepper({
    productName,
    quantity,
    disabled,
    onChange,
}: {
    productName: string;
    quantity: number;
    disabled: boolean;
    onChange: (quantity: number) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                aria-label={`افزایش تعداد ${productName}`}
                disabled={disabled}
                onClick={() => onChange(quantity + 1)}
                className={STEPPER_BUTTON_CLASS_NAME}
            >
                +
            </button>
            <span aria-live="polite" className="min-w-6 text-center">
                {quantity.toLocaleString("fa-IR")}
            </span>
            <button
                type="button"
                aria-label={`کاهش تعداد ${productName}`}
                disabled={disabled || quantity <= 1}
                onClick={() => onChange(quantity - 1)}
                className={STEPPER_BUTTON_CLASS_NAME}
            >
                −
            </button>
        </div>
    );
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

    // Runs a cart mutation for this row and shows any failure next to the row instead of page-wide.
    async function runRowAction(action: () => Promise<void>) {
        setRowError(null);
        try {
            await action();
        } catch (err) {
            setRowError(cartErrorMessage(err));
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
                <div className="flex flex-col items-end gap-2">
                    <div className="whitespace-nowrap text-end">
                        <p className="font-medium">{formatPrice(item.totalPrice)}</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            قیمت واحد: {formatPrice(item.unitPrice)}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <QuantityStepper
                            productName={item.productName}
                            quantity={item.quantity}
                            disabled={disabled}
                            onChange={(quantity) => void runRowAction(() => onUpdateQuantity(item.id, quantity))}
                        />
                        <button
                            type="button"
                            aria-label={`حذف ${item.productName}`}
                            disabled={disabled}
                            onClick={() => void runRowAction(() => onRemove(item.id))}
                            className="rounded p-1 text-zinc-500 hover:text-accent disabled:opacity-40"
                        >
                            <TrashIcon className="size-5" />
                        </button>
                    </div>
                </div>
            </div>
            {rowError && <ErrorAlert onDismiss={() => setRowError(null)}>{rowError}</ErrorAlert>}
        </li>
    );
}

function CartLoadError({message, onRetry}: {message: string; onRetry: () => void}) {
    return (
        <div className="flex flex-col items-start gap-3 text-zinc-500 dark:text-zinc-400">
            <p>{message}</p>
            <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-accent px-5 py-2 text-accent-foreground hover:bg-accent-hover"
            >
                تلاش دوباره
            </button>
        </div>
    );
}

function EmptyCart() {
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

function CartSummary({totalPrice}: {totalPrice: number}) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl bg-zinc-50 p-5 sm:sticky sm:top-24 dark:bg-zinc-900">
            <h2 className="font-semibold">جزئیات پرداخت</h2>
            <div className="flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">جمع کل</span>
                <span className="text-lg font-bold">{formatPrice(totalPrice)}</span>
            </div>
        </div>
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
        return <CartLoadError message={error} onRetry={() => void refresh()} />;
    }

    if (cart.items.length === 0) {
        return <EmptyCart />;
    }

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_18rem]">
            <ul className="flex min-w-0 flex-col">
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
            <CartSummary totalPrice={cart.totalPrice} />
        </div>
    );
}
