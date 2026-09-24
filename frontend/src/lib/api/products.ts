import {notFound} from "next/navigation";
import {API_BASE_URL} from "./config";
import type {ProductDetail, ProductSummary} from "./types";

export async function getProducts(): Promise<ProductSummary[]> {
    const response = await fetch(`${API_BASE_URL}/api/products`);

    if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
    }

    return response.json() as Promise<ProductSummary[]>;
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
    const response = await fetch(`${API_BASE_URL}/api/products/${slug}`);

    if (response.status === 404) {
        notFound();
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch product "${slug}": ${response.status}`);
    }

    return response.json() as Promise<ProductDetail>;
}
