import {describe, expect, it} from "vitest";
import {render, screen, fireEvent} from "@testing-library/react";
import {VariantSelector} from "./VariantSelector";
import type {ProductVariant} from "@/lib/api/types";

const tentVariants: ProductVariant[] = [
    {id: 1, sku: "TENT-3P-GRN", attributes: {"رنگ": "سبز"}, price: 4850000, stockQuantity: 12},
    {id: 2, sku: "TENT-3P-ORG", attributes: {"رنگ": "نارنجی"}, price: 5200000, stockQuantity: 0},
];

const chairVariants: ProductVariant[] = [
    {id: 1, sku: "CHAIR-FOLD-STD", attributes: {}, price: 950000, stockQuantity: 25},
];

describe("VariantSelector", () => {
    it("renders with the first variant selected by default", () => {
        render(<VariantSelector variants={tentVariants} productName="چادر کوهنوردی ۳ نفره" />);

        expect(screen.getByRole("radio", {name: /رنگ: سبز/})).toBeChecked();
        // The selected variant's price appears twice: once in the summary, once in its own option row.
        expect(screen.getAllByText("۴٬۸۵۰٬۰۰۰ ریال")).toHaveLength(2);
        expect(screen.getByText("۱۲ عدد موجود")).toBeInTheDocument();
    });

    it("updates the summary when a different variant is selected", () => {
        render(<VariantSelector variants={tentVariants} productName="چادر کوهنوردی ۳ نفره" />);

        fireEvent.click(screen.getByRole("radio", {name: /رنگ: نارنجی/}));

        expect(screen.getByRole("radio", {name: /رنگ: نارنجی/})).toBeChecked();
        expect(screen.getByRole("radio", {name: /رنگ: سبز/})).not.toBeChecked();
        // The newly selected variant's price now appears twice (summary + its own option row)...
        expect(screen.getAllByText("۵٬۲۰۰٬۰۰۰ ریال")).toHaveLength(2);
        // ...while the no-longer-selected variant's price appears only once (its own option row).
        expect(screen.getAllByText("۴٬۸۵۰٬۰۰۰ ریال")).toHaveLength(1);
    });

    it("shows 'ناموجود' for a zero-stock variant", () => {
        render(<VariantSelector variants={tentVariants} productName="چادر کوهنوردی ۳ نفره" />);

        fireEvent.click(screen.getByRole("radio", {name: /رنگ: نارنجی/}));

        expect(screen.getByText("ناموجود")).toBeInTheDocument();
    });

    it("shows the selected variant's attributes in the summary, in addition to its option label", () => {
        render(<VariantSelector variants={tentVariants} productName="چادر کوهنوردی ۳ نفره" />);

        // "رنگ: سبز" appears twice: once as the option's own label, once in the summary
        // above it, because the green variant is selected by default.
        expect(screen.getAllByText("رنگ: سبز")).toHaveLength(2);
        // "رنگ: نارنجی" appears once: only its own option label, since it isn't selected.
        expect(screen.getAllByText("رنگ: نارنجی")).toHaveLength(1);
    });

    it("does not show an attributes line when the variant has none", () => {
        render(<VariantSelector variants={chairVariants} productName="صندلی تاشو کمپینگ" />);

        expect(screen.queryByText(/رنگ:/)).not.toBeInTheDocument();
    });

    it("falls back to the product name as the option label when a variant has no attributes", () => {
        render(<VariantSelector variants={chairVariants} productName="صندلی تاشو کمپینگ" />);

        expect(screen.getByRole("radio", {name: /صندلی تاشو کمپینگ/})).toBeInTheDocument();
    });
});
