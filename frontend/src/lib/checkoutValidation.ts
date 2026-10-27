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

// The inputs' maxLength. For the text fields these are the backend's @Size limits; phone number and postal
// code have no length limit of their own (their format decides), so theirs only leave room for the spaces
// and hyphens a shopper may type between digit groups.
export const MAX_LENGTHS: Record<CheckoutField, number> = {
    firstName: 100,
    lastName: 100,
    phoneNumber: 20,
    address: 500,
    city: 100,
    postalCode: 20,
    notes: 1000,
};

function requiredWithLimit(label: string, field: CheckoutField): string {
    return `لطفاً ${label} را وارد کنید (حداکثر ${MAX_LENGTHS[field].toLocaleString("fa-IR")} نویسه).`;
}

// Shown on a field the backend rejected although the checks above let it through. The backend's own messages
// are English Bean Validation defaults and carry no stable code, so instead of parsing them, each field gets
// the full rule it must meet - the backend checks no other rule on it.
export const SERVER_REJECTION_MESSAGES: Record<CheckoutField, string> = {
    firstName: requiredWithLimit("نام", "firstName"),
    lastName: requiredWithLimit("نام خانوادگی", "lastName"),
    phoneNumber: PHONE_NUMBER_MESSAGE,
    address: requiredWithLimit("نشانی", "address"),
    city: requiredWithLimit("شهر", "city"),
    postalCode: POSTAL_CODE_MESSAGE,
    notes: `توضیحات حداکثر ${MAX_LENGTHS.notes.toLocaleString("fa-IR")} نویسه می‌تواند داشته باشد.`,
};

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
// maxLength attributes (MAX_LENGTHS) already stop longer text from being entered.
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
