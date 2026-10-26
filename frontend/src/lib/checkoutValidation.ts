import type {PlaceOrderRequest} from "@/lib/api/types";

export type CheckoutField = keyof PlaceOrderRequest;

// A message per invalid field; a field without an entry is valid.
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;

// Shown for a field the shopper left empty. notes is optional, so it has none.
const REQUIRED_MESSAGES: Record<Exclude<CheckoutField, "notes">, string> = {
    firstName: "لطفاً نام را وارد کنید.",
    lastName: "لطفاً نام خانوادگی را وارد کنید.",
    phoneNumber: "لطفاً شماره موبایل را وارد کنید.",
    address: "لطفاً نشانی را وارد کنید.",
    city: "لطفاً شهر را وارد کنید.",
    postalCode: "لطفاً کد پستی را وارد کنید.",
};

export const PHONE_NUMBER_MESSAGE = "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.";
export const POSTAL_CODE_MESSAGE = "کد پستی باید ۱۰ رقم باشد.";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

// The same normalization the backend applies to phoneNumber/postalCode (PlaceOrderRequest's constructor):
// Persian and Arabic digits become ASCII digits, and spaces/hyphens between digit groups are dropped. Without
// it, "۰۹۱۲ ۱۲۳ ۴۵۶۷" - a normal way to type a number on a Persian keyboard - would fail the checks below.
export function normalizeDigits(value: string): string {
    return value
        .replace(/[\s-]/g, "")
        .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

// Mirrors the backend's rules so the shopper gets immediate feedback, in Persian. It is only a convenience:
// the backend validates again and stays the authority. Maximum lengths aren't checked here; the inputs'
// maxLength attributes (matching the backend limits) already stop longer text from being entered.
export function validateCheckout(values: PlaceOrderRequest): CheckoutErrors {
    const errors: CheckoutErrors = {};

    for (const field of Object.keys(REQUIRED_MESSAGES) as (keyof typeof REQUIRED_MESSAGES)[]) {
        if (values[field].trim() === "") {
            errors[field] = REQUIRED_MESSAGES[field];
        }
    }

    if (!errors.phoneNumber && !/^09\d{9}$/.test(normalizeDigits(values.phoneNumber))) {
        errors.phoneNumber = PHONE_NUMBER_MESSAGE;
    }
    if (!errors.postalCode && !/^\d{10}$/.test(normalizeDigits(values.postalCode))) {
        errors.postalCode = POSTAL_CODE_MESSAGE;
    }

    return errors;
}
