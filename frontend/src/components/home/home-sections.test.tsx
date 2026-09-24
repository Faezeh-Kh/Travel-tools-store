import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {CategoriesSection} from "./CategoriesSection";
import {ProductsSection} from "./ProductsSection";
import type {Category, ProductSummary} from "@/lib/api/types";

const categories: Category[] = [
    {id: 1, name: "کمپینگ و سرپناه", slug: "camping-shelter", description: "توضیحات", imageUrl: null},
    {id: 2, name: "روشنایی و برق", slug: "lighting-power", description: "توضیحات", imageUrl: null},
];

const products: ProductSummary[] = [
    {
        id: 1,
        name: "چادر کوهنوردی ۳ نفره",
        slug: "tent-3-person-mountaineering",
        shortDescription: "توضیحات",
        primaryImage: null,
        minPrice: 4850000,
        maxPrice: 4850000,
    },
];

describe("CategoriesSection", () => {
    it("renders a card for each category", () => {
        render(<CategoriesSection categories={categories} />);

        expect(screen.getByRole("link", {name: /کمپینگ و سرپناه/})).toBeInTheDocument();
        expect(screen.getByRole("link", {name: /روشنایی و برق/})).toBeInTheDocument();
    });

    it("shows an empty-state message when there are no categories", () => {
        render(<CategoriesSection categories={[]} />);

        expect(screen.getByText("در حال حاضر دسته‌بندی‌ای برای نمایش وجود ندارد.")).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
});

describe("ProductsSection", () => {
    it("renders a card for each product plus a link to the full catalog", () => {
        render(<ProductsSection products={products} />);

        expect(screen.getByRole("link", {name: /چادر کوهنوردی ۳ نفره/})).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "مشاهده همه محصولات"})).toBeInTheDocument();
    });

    it("shows an empty-state message when there are no products", () => {
        render(<ProductsSection products={[]} />);

        expect(screen.getByText("در حال حاضر محصولی برای نمایش وجود ندارد.")).toBeInTheDocument();
        expect(screen.queryByRole("link", {name: /مشاهده همه محصولات/})).not.toBeInTheDocument();
    });
});
