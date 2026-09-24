import {describe, expect, it} from "vitest";
import {render, screen, fireEvent} from "@testing-library/react";
import {ProductCard} from "./ProductCard";
import {CategoryCard} from "./CategoryCard";
import type {Category, ProductSummary} from "@/lib/api/types";

const productWithImage: ProductSummary = {
    id: 1,
    name: "چادر کوهنوردی ۳ نفره",
    slug: "tent-3-person-mountaineering",
    shortDescription: "توضیحات",
    primaryImage: "/images/products/tent-3-person-mountaineering/1.jpg",
    minPrice: 4850000,
    maxPrice: 4850000,
};

const productWithoutImage: ProductSummary = {
    ...productWithImage,
    primaryImage: null,
};

const categoryWithImage: Category = {
    id: 1,
    name: "کمپینگ و سرپناه",
    slug: "camping-shelter",
    description: "توضیحات",
    imageUrl: "https://example.com/images/camping-shelter.jpg",
};

const categoryWithoutImage: Category = {
    ...categoryWithImage,
    imageUrl: null,
};

describe("ProductCard image fallback", () => {
    it("shows the placeholder when there is no primary image", () => {
        render(<ProductCard product={productWithoutImage} />);

        expect(screen.getByText("بدون تصویر")).toBeInTheDocument();
        expect(screen.queryByAltText(productWithoutImage.name)).not.toBeInTheDocument();
    });

    it("renders the real image when a primary image exists", () => {
        render(<ProductCard product={productWithImage} />);

        expect(screen.getByAltText(productWithImage.name)).toBeInTheDocument();
        expect(screen.queryByText("بدون تصویر")).not.toBeInTheDocument();
    });

    it("falls back to the placeholder when the image fails to load", () => {
        render(<ProductCard product={productWithImage} />);

        fireEvent.error(screen.getByAltText(productWithImage.name));

        expect(screen.getByText("بدون تصویر")).toBeInTheDocument();
        expect(screen.queryByAltText(productWithImage.name)).not.toBeInTheDocument();
    });
});

describe("CategoryCard image fallback", () => {
    it("shows the placeholder when there is no image URL", () => {
        render(<CategoryCard category={categoryWithoutImage} />);

        expect(screen.getByText("بدون تصویر")).toBeInTheDocument();
        expect(screen.queryByAltText(categoryWithoutImage.name)).not.toBeInTheDocument();
    });

    it("renders the real image when an image URL exists", () => {
        render(<CategoryCard category={categoryWithImage} />);

        expect(screen.getByAltText(categoryWithImage.name)).toBeInTheDocument();
        expect(screen.queryByText("بدون تصویر")).not.toBeInTheDocument();
    });

    it("falls back to the placeholder when the image fails to load", () => {
        render(<CategoryCard category={categoryWithImage} />);

        fireEvent.error(screen.getByAltText(categoryWithImage.name));

        expect(screen.getByText("بدون تصویر")).toBeInTheDocument();
        expect(screen.queryByAltText(categoryWithImage.name)).not.toBeInTheDocument();
    });
});
