"use client";

import {useState} from "react";
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

export function VariantSelector({
    variants,
    productName,
}: {
    variants: ProductVariant[];
    productName: string;
}) {
    const [selectedId, setSelectedId] = useState(variants[0].id);
    const selectedVariant = variants.find((variant) => variant.id === selectedId) ?? variants[0];
    const selectedAttributes = formatAttributes(selectedVariant.attributes);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <p className="text-2xl font-bold text-accent">{formatPrice(selectedVariant.price)}</p>
                {selectedAttributes.length > 0 && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectedAttributes}</p>
                )}
                <p className="text-sm font-medium">
                    {selectedVariant.stockQuantity > 0
                        ? `${selectedVariant.stockQuantity.toLocaleString("fa-IR")} عدد موجود`
                        : "ناموجود"}
                </p>
            </div>
            <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">انتخاب گزینه محصول</legend>
                {variants.map((variant) => (
                    <label
                        key={variant.id}
                        className={`flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${
                            variant.id === selectedId
                                ? "border-accent"
                                : "border-zinc-200 dark:border-zinc-800"
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="variant"
                                value={variant.id}
                                checked={variant.id === selectedId}
                                onChange={() => setSelectedId(variant.id)}
                                className="accent-accent"
                            />
                            {describeVariant(variant, productName)}
                        </span>
                        <span>{formatPrice(variant.price)}</span>
                    </label>
                ))}
            </fieldset>
        </div>
    );
}
