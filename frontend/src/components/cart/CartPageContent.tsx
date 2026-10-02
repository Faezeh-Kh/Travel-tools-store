"use client";

import {useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {useCart} from "@/components/cart/CartProvider";
import {cartErrorMessage} from "@/lib/cartErrorMessages";
import {formatPrice} from "@/lib/format";
import {TrashIcon} from "@/components/icons/TrashIcon";
import {ErrorAlert} from "@/components/ErrorAlert";
import type {CartItem} from "@/lib/api/types";

// enabled:hover (not plain hover): :disabled doesn't block :hover from matching on its own, so an
// unqualified hover:* would still visibly react on a disabled button. Scoping it to :enabled makes the
// hover state itself communicate pressability, not just the dimmed opacity.
const STEPPER_BUTTON_CLASS_NAME =
    "flex size-7 items-center justify-center rounded border border-zinc-300 enabled:hover:border-accent enabled:hover:bg-accent/10 disabled:opacity-40 dark:border-zinc-700";

function QuantityStepper({
    productName,
    quantity,
    disabled,
    atStockLimit,
    onChange,
}: {
    productName: string;
    quantity: number;
    disabled: boolean;
    atStockLimit: boolean;
    onChange: (quantity: number) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                aria-label={`افزایش تعداد ${productName}`}
                disabled={disabled || atStockLimit}
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

// Exported so it can sit alongside ProductCard/CategoryCard in image-fallback.test.tsx, the project's
// one designated file for this placeholder/onError pattern, instead of duplicating that coverage here.
export function CartItemThumbnail({item}: {item: CartItem}) {
    const [imageFailed, setImageFailed] = useState(false);

    if (!item.primaryImage || imageFailed) {
        return (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-center text-[10px] text-zinc-400 dark:bg-zinc-900">
                بدون تصویر
            </div>
        );
    }

    return (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900">
            <Image
                src={item.primaryImage}
                alt={item.productName}
                fill
                sizes="64px"
                // Temporary: no real image storage exists yet, so there's no known domain to allowlist in
                // next.config.ts. Once Phase 7 adds real upload/storage, add that origin to
                // images.remotePatterns and drop this prop.
                unoptimized
                className="object-cover"
                onError={() => setImageFailed(true)}
            />
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
    const atStockLimit = item.quantity >= item.stockQuantity;

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
                <div className="flex items-start gap-3">
                    <Link href={`/products/${item.productSlug}`} className="shrink-0 rounded">
                        <CartItemThumbnail item={item} />
                    </Link>
                    <div>
                        <Link
                            href={`/products/${item.productSlug}`}
                            className="rounded font-semibold hover:text-accent hover:underline"
                        >
                            {item.productName}
                        </Link>
                        {attributeEntries.length > 0 && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {attributeEntries.map(([key, value]) => `${key}: ${value}`).join("، ")}
                            </p>
                        )}
                    </div>
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
                            atStockLimit={atStockLimit}
                            onChange={(quantity) => void runRowAction(() => onUpdateQuantity(item.id, quantity))}
                        />
                        <button
                            type="button"
                            aria-label={`حذف ${item.productName}`}
                            disabled={disabled}
                            onClick={() => void runRowAction(() => onRemove(item.id))}
                            className="rounded p-1 text-zinc-500 enabled:hover:text-accent disabled:opacity-40"
                        >
                            <TrashIcon className="size-5" />
                        </button>
                    </div>
                    {rowError && <ErrorAlert onDismiss={() => setRowError(null)}>{rowError}</ErrorAlert>}
                </div>
            </div>
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
            {/* pe-3: breathing room between the scrollbar and row content - under RTL the scrollbar
                renders on the physical left, the same side the price/actions column is aligned to. */}
            <ul className="flex max-h-[70vh] min-w-0 flex-col overflow-y-auto pe-3">
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
