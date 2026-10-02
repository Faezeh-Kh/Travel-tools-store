"use client";

import {useState} from "react";
import {useCart} from "@/components/cart/CartProvider";
import {cartErrorMessage} from "@/lib/cartErrorMessages";
import {ErrorAlert} from "@/components/ErrorAlert";
import type {ProductVariant} from "@/lib/api/types";
import {formatPrice} from "@/lib/format";

function formatAttributes(attributes: Record<string, string>): string {
    return Object.entries(attributes)
        .map(([key, value]) => `${key}: ${value}`)
        .join("، ");
}

function describeVariant(variant: ProductVariant, productName: string): string {
    const description = formatAttributes(variant.attributes);
    return description.length > 0 ? description : productName;
}

// stockQuantity is the store's total, not aware of what this shopper already put in their cart -
// without subtracting that, a shopper could hold the entire stock in their cart and still see "N
// available" here, then get a conflict error on a click that could never have succeeded.
function stockMessage(variant: ProductVariant, remainingStock: number): string {
    if (variant.stockQuantity === 0) return "ناموجود";
    if (remainingStock > 0) return `${remainingStock.toLocaleString("fa-IR")} عدد موجود`;
    return "تمام موجودی این گزینه در سبد خرید شماست.";
}

function VariantSummary({variant, remainingStock}: {variant: ProductVariant; remainingStock: number}) {
    const attributes = formatAttributes(variant.attributes);

    return (
        <div className="flex flex-col gap-1">
            <p className="text-2xl font-bold text-accent">{formatPrice(variant.price)}</p>
            {attributes.length > 0 && <p className="text-sm text-zinc-600 dark:text-zinc-400">{attributes}</p>}
            <p className="text-sm font-medium">{stockMessage(variant, remainingStock)}</p>
        </div>
    );
}

// A single variant is already described by the summary above, so a one-option choice would only
// repeat it; add-to-cart then simply adds that variant.
function VariantOptions({
    variants,
    productName,
    selectedId,
    onSelect,
}: {
    variants: ProductVariant[];
    productName: string;
    selectedId: number;
    onSelect: (id: number) => void;
}) {
    if (variants.length <= 1) return null;

    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">انتخاب گزینه محصول</legend>
            {variants.map((variant) => (
                <label
                    key={variant.id}
                    className={`flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${
                        variant.id === selectedId ? "border-accent" : "border-zinc-200 dark:border-zinc-800"
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="variant"
                            value={variant.id}
                            checked={variant.id === selectedId}
                            onChange={() => onSelect(variant.id)}
                            className="accent-accent"
                        />
                        {describeVariant(variant, productName)}
                    </span>
                    <span>{formatPrice(variant.price)}</span>
                </label>
            ))}
        </fieldset>
    );
}

function AddToCartControl({
    disabled,
    isMutating,
    error,
    onAdd,
    onDismissError,
}: {
    disabled: boolean;
    isMutating: boolean;
    error: string | null;
    onAdd: () => void;
    onDismissError: () => void;
}) {
    return (
        // items-end: the logical end edge, which under this site's RTL layout is the physical left.
        <div className="flex flex-col items-end gap-2">
            <button
                type="button"
                disabled={disabled}
                onClick={onAdd}
                className="rounded-full bg-accent px-10 py-3 text-base font-semibold text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isMutating ? "در حال افزودن..." : "افزودن به سبد خرید"}
            </button>
            {error && <ErrorAlert onDismiss={onDismissError}>{error}</ErrorAlert>}
        </div>
    );
}

export function VariantSelector({variants, productName}: {variants: ProductVariant[]; productName: string}) {
    const [selectedId, setSelectedId] = useState(variants[0].id);
    const selectedVariant = variants.find((variant) => variant.id === selectedId) ?? variants[0];
    const {addItem, isMutating, cart} = useCart();
    const [addError, setAddError] = useState<string | null>(null);

    const quantityInCart = cart.items.find((item) => item.productVariantId === selectedVariant.id)?.quantity ?? 0;
    const remainingStock = selectedVariant.stockQuantity - quantityInCart;

    function handleSelectVariant(id: number) {
        setSelectedId(id);
        setAddError(null);
    }

    async function handleAddToCart() {
        setAddError(null);
        try {
            await addItem(selectedVariant.id, 1);
        } catch (err) {
            setAddError(cartErrorMessage(err));
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <VariantSummary variant={selectedVariant} remainingStock={remainingStock} />
            <VariantOptions
                variants={variants}
                productName={productName}
                selectedId={selectedId}
                onSelect={handleSelectVariant}
            />
            <AddToCartControl
                disabled={remainingStock <= 0 || isMutating}
                isMutating={isMutating}
                error={addError}
                onAdd={() => void handleAddToCart()}
                onDismissError={() => setAddError(null)}
            />
        </div>
    );
}
