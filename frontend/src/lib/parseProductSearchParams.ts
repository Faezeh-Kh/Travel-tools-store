import {PRODUCT_SORT_VALUES, type ProductSearchParams, type ProductSort} from "@/lib/api/types";

function firstValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

export function parseProductSearchParams(
    params: {[key: string]: string | string[] | undefined},
): ProductSearchParams {
    const search = firstValue(params.search);
    const category = firstValue(params.category);
    const inStock = firstValue(params.inStock) === "true";
    const sort = firstValue(params.sort);
    const page = Number(firstValue(params.page));

    return {
        ...(search ? {search} : {}),
        ...(category ? {category} : {}),
        ...(inStock ? {inStock} : {}),
        ...(PRODUCT_SORT_VALUES.includes(sort as ProductSort) ? {sort: sort as ProductSort} : {}),
        ...(Number.isInteger(page) && page >= 0 ? {page} : {}),
    };
}

export function buildProductSearchQueryString(params: ProductSearchParams): string {
    const searchParams = new URLSearchParams();

    if (params.search) searchParams.set("search", params.search);
    if (params.category) searchParams.set("category", params.category);
    if (params.inStock) searchParams.set("inStock", "true");
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.page !== undefined) searchParams.set("page", String(params.page));
    if (params.size !== undefined) searchParams.set("size", String(params.size));

    const query = searchParams.toString();
    return query ? `?${query}` : "";
}
