export type PaginationItem = number | "ellipsis";

/**
 * Builds a truncated page-number range: always the first and last page, a window of
 * `siblingCount` pages around `currentPage`, and "ellipsis" markers for the gaps between them.
 */
export function getPaginationRange(currentPage: number, totalPages: number, siblingCount = 1): PaginationItem[] {
    if (totalPages <= 1) return [];

    const siblingsStart = Math.max(currentPage - siblingCount, 0);
    const siblingsEnd = Math.min(currentPage + siblingCount, totalPages - 1);

    const range: PaginationItem[] = [];

    range.push(0);
    if (siblingsStart > 1) range.push("ellipsis");

    for (let page = Math.max(siblingsStart, 1); page <= Math.min(siblingsEnd, totalPages - 2); page++) {
        range.push(page);
    }

    if (siblingsEnd < totalPages - 2) range.push("ellipsis");
    if (totalPages - 1 > 0) range.push(totalPages - 1);

    return range;
}
