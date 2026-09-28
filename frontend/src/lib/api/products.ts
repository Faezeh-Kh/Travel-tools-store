import {notFound} from "next/navigation";
import {API_BASE_URL} from "./config";
import type {PageResponse, ProductDetail, ProductSearchParams, ProductSummary} from "./types";
import {buildProductSearchQueryString} from "@/lib/parseProductSearchParams";

export const PAGE_SIZE = 20;

export async function getProducts(params: ProductSearchParams = {}): Promise<PageResponse<ProductSummary>> {
    const response = await fetch(`${API_BASE_URL}/api/products${buildProductSearchQueryString(params)}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
    }

    return response.json() as Promise<PageResponse<ProductSummary>>;
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
