"use client";

import {type ChangeEvent, type SubmitEvent, useId, useRef, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useCart} from "@/components/cart/CartProvider";
import {ErrorAlert} from "@/components/ErrorAlert";
import {OrderError, placeOrder} from "@/lib/api/orders";
import type {Order, PlaceOrderRequest} from "@/lib/api/types";
import {type CheckoutErrors, type CheckoutField, validateCheckout} from "@/lib/checkoutValidation";

const EMPTY_VALUES: PlaceOrderRequest = {
    firstName: "",
    lastName: "",
    phoneNumber: "",
    address: "",
    city: "",
    postalCode: "",
    notes: "",
};

// Why the last submit failed, which decides the message shown above the submit button:
// - "validation": the backend rejected fields the client-side check let through (each is marked below);
// - "cart": the cart changed - an item became unavailable or short of stock, or the cart is gone/empty;
// - "generic": anything else, including a network failure.
type SubmitFailure = "validation" | "cart" | "generic";

// The backend's own field messages are English Bean Validation defaults, so they are never shown; a field
// it rejected gets this Persian message instead.
const SERVER_FIELD_MESSAGE = "این مقدار پذیرفته نشد. لطفاً آن را بررسی کنید.";

// Object.hasOwn rather than `in`: "toString" is `in` every object, but it isn't a form field.
function isCheckoutField(field: string): field is CheckoutField {
    return Object.hasOwn(EMPTY_VALUES, field);
}

// Turns a failed placeOrder() into what the form shows: the failure kind, plus field errors when the backend
// pointed at specific fields this form has.
function describeFailure(err: unknown): {failure: SubmitFailure; fieldErrors: CheckoutErrors} {
    if (err instanceof OrderError) {
        if (err.code === "VALIDATION_ERROR") {
            const fieldErrors: CheckoutErrors = {};
            for (const {field} of err.fieldErrors) {
                if (isCheckoutField(field)) {
                    fieldErrors[field] = SERVER_FIELD_MESSAGE;
                }
            }
            if (Object.keys(fieldErrors).length > 0) {
                return {failure: "validation", fieldErrors};
            }
        }
        if (err.code === "CONFLICT" || err.code === "NOT_FOUND") {
            return {failure: "cart", fieldErrors: {}};
        }
    }
    return {failure: "generic", fieldErrors: {}};
}

// Moves focus to the first invalid field (in page order), so keyboard and screen reader users land where
// the problem is instead of having to search for it.
function focusFirstInvalid(form: HTMLFormElement, errors: CheckoutErrors) {
    const firstInvalid = Array.from(form.elements).find(
        (element): element is HTMLInputElement | HTMLTextAreaElement =>
            (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
            errors[element.name as CheckoutField] !== undefined,
    );
    firstInvalid?.focus();
}

const CONTROL_CLASS_NAME =
    "w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 aria-invalid:border-red-500 dark:border-zinc-700";

// One labeled input or textarea with its error message. The message is linked to the control through
// aria-describedby, so a screen reader reads it when the control gets focus, and aria-invalid marks the
// control as invalid (it also drives the red border via Tailwind's aria-invalid: variant).
function Field({
    name,
    label,
    value,
    error,
    onChange,
    optional = false,
    multiline = false,
    maxLength,
    type = "text",
    inputMode,
    autoComplete,
    dir,
}: {
    name: CheckoutField;
    label: string;
    value: string;
    error?: string;
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    optional?: boolean;
    multiline?: boolean;
    maxLength: number;
    type?: "text" | "tel";
    inputMode?: "numeric";
    autoComplete?: string;
    dir?: "ltr";
}) {
    const id = useId();
    const errorId = `${id}-error`;
    const controlProps = {
        id,
        name,
        value,
        onChange,
        maxLength,
        autoComplete,
        dir,
        required: !optional,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
        className: CONTROL_CLASS_NAME,
    };

    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
                {optional && <span className="font-normal text-zinc-500"> (اختیاری)</span>}
            </label>
            {multiline ? <textarea rows={3} {...controlProps} /> : <input type={type} inputMode={inputMode} {...controlProps} />}
            {error && (
                <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}

export function CheckoutForm() {
    const router = useRouter();
    const {refresh: refreshCart} = useCart();
    const [values, setValues] = useState<PlaceOrderRequest>(EMPTY_VALUES);
    const [errors, setErrors] = useState<CheckoutErrors>({});
    // Errors appear only after the first submit attempt, so the shopper isn't told off while still typing.
    // From then on, every edit re-checks the edited field.
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [failure, setFailure] = useState<SubmitFailure | null>(null);
    // The state drives what is shown (disabled button, its label); the ref is the double-submit guard. As in
    // CartProvider, a ref changes immediately, while a state update only shows on the next render, so a
    // second submit in the same tick could still read a stale `false` from state.
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    // One handler for every field: the input's name attribute says which value to update. After a submit
    // attempt, the edited field is validated again, so its message updates (e.g. from "required" to "must
    // be 10 digits"), disappears only once the value is valid, and appears if a valid value is broken.
    function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const field = event.currentTarget.name as CheckoutField;
        const nextValues = {...values, [field]: event.currentTarget.value};
        setValues(nextValues);
        if (submitAttempted) {
            setErrors((current) => ({...current, [field]: validateCheckout(nextValues)[field]}));
        }
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        // Stop the browser's own full-page form submission; this component handles submitting itself.
        event.preventDefault();
        if (isSubmittingRef.current) {
            return;
        }
        // Kept before the first `await`: React clears event.currentTarget once the handler has yielded.
        const form = event.currentTarget;
        setSubmitAttempted(true);
        setFailure(null);

        const validationErrors = validateCheckout(values);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            focusFirstInvalid(form, validationErrors);
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        let order: Order;
        try {
            order = await placeOrder(values);
        } catch (err) {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
            const described = describeFailure(err);
            setFailure(described.failure);
            if (described.failure === "validation") {
                setErrors(described.fieldErrors);
                focusFirstInvalid(form, described.fieldErrors);
            } else if (described.failure === "cart") {
                // The cart on the server is no longer what this tab shows; reload it so the shopper sees
                // what changed when they follow the link back to the cart.
                void refreshCart();
            }
            return;
        }

        // The order exists now. The button stays disabled (isSubmitting is not reset) until the confirmation
        // page replaces this one, so it can't be submitted again in between.
        // Checkout emptied the cart on the server: reload it, which also updates the header badge in every
        // open tab. Not awaited - navigating needn't wait for it, and refresh() never rejects.
        void refreshCart();
        // replace, not push: "back" from the confirmation then returns to the cart, not to a checkout form
        // for a cart that has already been ordered.
        router.replace(`/orders/${encodeURIComponent(order.accessToken)}`);
    }

    return (
        // noValidate: the inputs keep `required` (screen readers announce it), but the browser's own
        // validation bubbles are turned off in favor of the Persian messages shown under each field.
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field name="firstName" label="نام" value={values.firstName} error={errors.firstName}
                       onChange={handleChange} maxLength={100} autoComplete="given-name" />
                <Field name="lastName" label="نام خانوادگی" value={values.lastName} error={errors.lastName}
                       onChange={handleChange} maxLength={100} autoComplete="family-name" />
                {/* Phone number and postal code are digit strings, so they read left-to-right even in this RTL page. */}
                <Field name="phoneNumber" label="شماره موبایل" value={values.phoneNumber} error={errors.phoneNumber}
                       onChange={handleChange} maxLength={20} type="tel" inputMode="numeric" autoComplete="tel"
                       dir="ltr" />
                <Field name="city" label="شهر" value={values.city} error={errors.city}
                       onChange={handleChange} maxLength={100} autoComplete="address-level2" />
                <Field name="postalCode" label="کد پستی" value={values.postalCode} error={errors.postalCode}
                       onChange={handleChange} maxLength={20} inputMode="numeric" autoComplete="postal-code"
                       dir="ltr" />
            </div>
            <Field name="address" label="نشانی" value={values.address} error={errors.address}
                   onChange={handleChange} maxLength={500} multiline autoComplete="street-address" />
            <Field name="notes" label="توضیحات" value={values.notes} error={errors.notes}
                   onChange={handleChange} maxLength={1000} multiline optional />
            {failure && (
                <ErrorAlert onDismiss={() => setFailure(null)}>
                    {failure === "validation" && "برخی از اطلاعات واردشده پذیرفته نشد. لطفاً فیلدهای مشخص‌شده را بررسی کنید."}
                    {failure === "cart" && (
                        <>
                            سفارش ثبت نشد، چون سبد خرید شما تغییر کرده است؛ ممکن است کالایی ناموجود شده یا موجودی
                            آن کافی نباشد.{" "}
                            <Link href="/cart" className="font-medium underline">
                                بازگشت به سبد خرید
                            </Link>
                        </>
                    )}
                    {failure === "generic" && "ثبت سفارش انجام نشد. لطفاً دوباره تلاش کنید."}
                </ErrorAlert>
            )}
            <button
                type="submit"
                disabled={isSubmitting}
                className="self-start rounded-full bg-accent px-10 py-3 text-base font-semibold text-accent-foreground enabled:hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isSubmitting ? "در حال ثبت سفارش…" : "ثبت سفارش"}
            </button>
        </form>
    );
}
