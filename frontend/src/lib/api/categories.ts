import {notFound} from "next/navigation";
import {API_BASE_URL} from "./config";
import type {Category} from "./types";

export async function getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/api/categories`);

    if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
    }

    return response.json() as Promise<Category[]>;
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
    const categories = await getCategories();
    const category = categories.find((c) => c.slug === slug);

    if (!category) {
        notFound();
    }

    return category;
}
