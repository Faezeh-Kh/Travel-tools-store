import {CartError} from "@/lib/api/cart";

// The single place cart-related Persian user-facing text lives. Backend messages (and CartError's own
// `message`) stay English/machine-readable - this maps the stable `code` to what the shopper sees, so
// translation never depends on parsing prose the backend might change.
const CART_ERROR_MESSAGES: Record<string, string> = {
    NOT_FOUND: "موردی که به دنبال آن بودید یافت نشد. لطفاً صفحه را به روز رسانی کنید.",
    CONFLICT: "موجودی این محصول کافی نیست.",
    CLIENT_BUSY: "عملیات قبلی هنوز در حال انجام است.",
};

export function cartErrorMessage(err: unknown): string {
    if (!(err instanceof CartError)) {
        return "خطایی رخ داد.";
    }
    return CART_ERROR_MESSAGES[err.code] ?? "خطایی رخ داد.";
}
