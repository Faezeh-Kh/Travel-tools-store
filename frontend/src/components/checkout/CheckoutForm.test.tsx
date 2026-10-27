import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {Order} from "@/lib/api/types";

const {placeOrder, refresh, replace, cartState} = vi.hoisted(() => ({
    placeOrder: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    // The cart's load state as useCart() reports it; a test changes it, then re-renders, to put the form
    // in front of a cart that is reloading or failed to reload.
    cartState: {isLoading: false, loadError: null as string | null},
}));

// Partial mock: keeps the real OrderError, so the form's `instanceof OrderError` checks see the same class
// the tests construct.
vi.mock("@/lib/api/orders", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/api/orders")>()),
    placeOrder,
}));
vi.mock("@/components/cart/CartProvider", () => ({useCart: () => ({refresh, ...cartState})}));
vi.mock("next/navigation", () => ({useRouter: () => ({replace})}));

import {OrderError} from "@/lib/api/orders";
import {CheckoutForm} from "./CheckoutForm";

const placedOrder: Order = {
    orderNumber: "TT-100001",
    accessToken: "22222222-2222-2222-2222-222222222222",
    status: "PENDING",
    firstName: "سارا",
    lastName: "محمدی",
    phoneNumber: "09121234567",
    address: "خیابان آزادی، پلاک ۱۰",
    city: "تهران",
    postalCode: "1234567890",
    notes: null,
    items: [],
    totalPrice: 9700000,
    createdAt: "2026-10-14T10:00:00Z",
};

beforeEach(() => {
    vi.clearAllMocks();
    refresh.mockResolvedValue(undefined);
    cartState.isLoading = false;
    cartState.loadError = null;
});

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {promise, resolve, reject};
}

function fillValidForm() {
    fireEvent.change(screen.getByLabelText("نام"), {target: {value: "سارا"}});
    fireEvent.change(screen.getByLabelText("نام خانوادگی"), {target: {value: "محمدی"}});
    fireEvent.change(screen.getByLabelText("شماره موبایل"), {target: {value: "۰۹۱۲ ۱۲۳ ۴۵۶۷"}});
    fireEvent.change(screen.getByLabelText("شهر"), {target: {value: "تهران"}});
    fireEvent.change(screen.getByLabelText("کد پستی"), {target: {value: "1234567890"}});
    fireEvent.change(screen.getByLabelText("نشانی"), {target: {value: "خیابان آزادی، پلاک ۱۰"}});
}

function submitButton() {
    return screen.getByRole("button", {name: /ثبت سفارش/});
}

function submit() {
    fireEvent.click(submitButton());
}

describe("CheckoutForm validation", () => {
    it("does not place an order from an invalid form, and marks and describes each invalid field", () => {
        render(<CheckoutForm />);

        fillValidForm();
        fireEvent.change(screen.getByLabelText("نام"), {target: {value: ""}});
        fireEvent.change(screen.getByLabelText("کد پستی"), {target: {value: "12345"}});
        submit();

        expect(placeOrder).not.toHaveBeenCalled();
        expect(screen.getByLabelText("نام")).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByLabelText("نام")).toHaveAccessibleDescription("لطفاً نام را وارد کنید.");
        expect(screen.getByLabelText("کد پستی")).toHaveAccessibleDescription("کد پستی باید ۱۰ رقم باشد.");
        expect(screen.getByLabelText("نام خانوادگی")).not.toHaveAttribute("aria-invalid");
    });

    it("moves focus to the first invalid field in page order", () => {
        render(<CheckoutForm />);

        fillValidForm();
        fireEvent.change(screen.getByLabelText("نشانی"), {target: {value: ""}});
        fireEvent.change(screen.getByLabelText("شماره موبایل"), {target: {value: "0912"}});
        submit();

        expect(screen.getByLabelText("شماره موبایل")).toHaveFocus();
    });

    it("clears a field's error once an edit makes it valid, leaving the others", () => {
        render(<CheckoutForm />);

        submit();
        fireEvent.change(screen.getByLabelText("نام"), {target: {value: "س"}});

        expect(screen.getByLabelText("نام")).not.toHaveAttribute("aria-invalid");
        expect(screen.queryByText("لطفاً نام را وارد کنید.")).not.toBeInTheDocument();
        expect(screen.getByText("لطفاً نام خانوادگی را وارد کنید.")).toBeInTheDocument();
    });

    it("keeps a field's error, updated, while an edit leaves it invalid after a submit", () => {
        render(<CheckoutForm />);
        const postalCode = screen.getByLabelText("کد پستی");

        submit();
        expect(postalCode).toHaveAccessibleDescription("لطفاً کد پستی را وارد کنید.");

        fireEvent.change(postalCode, {target: {value: "12345"}});
        expect(postalCode).toHaveAttribute("aria-invalid", "true");
        expect(postalCode).toHaveAccessibleDescription("کد پستی باید ۱۰ رقم باشد.");

        fireEvent.change(postalCode, {target: {value: "1234567890"}});
        expect(postalCode).not.toHaveAttribute("aria-invalid");
    });

    it("flags a valid field that an edit makes invalid after a submit", () => {
        render(<CheckoutForm />);

        fillValidForm();
        fireEvent.change(screen.getByLabelText("نام"), {target: {value: ""}});
        submit();
        fireEvent.change(screen.getByLabelText("شماره موبایل"), {target: {value: "0912"}});

        expect(screen.getByLabelText("شماره موبایل")).toHaveAccessibleDescription(
            "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.",
        );
    });

    it("shows no errors while the shopper types before the first submit", () => {
        render(<CheckoutForm />);

        fireEvent.change(screen.getByLabelText("کد پستی"), {target: {value: "12345"}});

        expect(screen.getByLabelText("کد پستی")).not.toHaveAttribute("aria-invalid");
    });

    it("marks notes as optional and never requires it", async () => {
        placeOrder.mockResolvedValue(placedOrder);
        render(<CheckoutForm />);

        expect(screen.getByLabelText(/توضیحات/)).not.toBeRequired();
        expect(screen.getByLabelText("نام")).toBeRequired();

        fillValidForm();
        submit();

        await waitFor(() => expect(placeOrder).toHaveBeenCalledOnce());
    });
});

describe("CheckoutForm submission", () => {
    it("places the order with the details as typed, then refreshes the cart and opens the confirmation", async () => {
        placeOrder.mockResolvedValue(placedOrder);
        render(<CheckoutForm />);

        fillValidForm();
        fireEvent.change(screen.getByLabelText(/توضیحات/), {target: {value: "زنگ نزنید"}});
        submit();

        // Sent as typed (Persian digits included); the backend normalizes them.
        expect(placeOrder).toHaveBeenCalledExactlyOnceWith({
            firstName: "سارا",
            lastName: "محمدی",
            phoneNumber: "۰۹۱۲ ۱۲۳ ۴۵۶۷",
            address: "خیابان آزادی، پلاک ۱۰",
            city: "تهران",
            postalCode: "1234567890",
            notes: "زنگ نزنید",
        });
        await waitFor(() =>
            expect(replace).toHaveBeenCalledExactlyOnceWith("/orders/22222222-2222-2222-2222-222222222222"),
        );
        expect(refresh).toHaveBeenCalledOnce();
        // Stays disabled until the confirmation page replaces the form.
        expect(submitButton()).toBeDisabled();
    });

    it("disables the button while the order is being placed and ignores a second submit", async () => {
        const pending = deferred<Order>();
        placeOrder.mockReturnValue(pending.promise);
        const {container} = render(<CheckoutForm />);

        fillValidForm();
        submit();
        // fireEvent.submit on the form bypasses the disabled button, so this exercises the guard itself.
        fireEvent.submit(container.querySelector("form")!);

        expect(submitButton()).toBeDisabled();
        expect(submitButton()).toHaveTextContent("در حال ثبت سفارش…");
        expect(placeOrder).toHaveBeenCalledOnce();

        await act(async () => pending.resolve(placedOrder));
        expect(replace).toHaveBeenCalledOnce();
    });

    it("marks the fields the backend rejected, focuses the first, and allows another try", async () => {
        placeOrder.mockRejectedValue(
            new OrderError("VALIDATION_ERROR", "Validation failed.", [
                {field: "postalCode", message: "must match \"\\d{10}\""},
                {field: "unknownField", message: "ignored"},
            ]),
        );
        render(<CheckoutForm />);

        fillValidForm();
        submit();

        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("پذیرفته نشد"));
        const postalCode = screen.getByLabelText("کد پستی");
        expect(postalCode).toHaveAttribute("aria-invalid", "true");
        expect(postalCode).toHaveAccessibleDescription("این مقدار پذیرفته نشد. لطفاً آن را بررسی کنید.");
        expect(postalCode).toHaveFocus();
        // The backend's English message is never shown.
        expect(screen.queryByText(/must match/)).not.toBeInTheDocument();
        expect(submitButton()).toBeEnabled();
        expect(replace).not.toHaveBeenCalled();
    });

    it.each(["CONFLICT", "NOT_FOUND"])(
        "explains a %s cart failure with a link back to the cart, and reloads the cart",
        async (code) => {
            placeOrder.mockRejectedValue(new OrderError(code, "Only 1 unit(s) of TENT-3P-GRN are available."));
            render(<CheckoutForm />);

            fillValidForm();
            submit();

            await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("سبد خرید شما تغییر کرده است"));
            expect(screen.getByRole("link", {name: "بازگشت به سبد خرید"})).toHaveAttribute("href", "/cart");
            expect(refresh).toHaveBeenCalledOnce();
            // The entered details are kept for when the shopper comes back.
            expect(screen.getByLabelText("نام")).toHaveValue("سارا");
            expect(submitButton()).toBeEnabled();
            expect(replace).not.toHaveBeenCalled();
        },
    );

    it("holds the submit lock after a cart failure until the cart reload has finished", async () => {
        const reload = deferred<void>();
        refresh.mockReturnValue(reload.promise);
        placeOrder.mockRejectedValue(new OrderError("CONFLICT", "Only 1 unit(s) of TENT-3P-GRN are available."));
        const {container} = render(<CheckoutForm />);

        fillValidForm();
        submit();
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("سبد خرید شما تغییر کرده است"));

        // The reload is still running: neither the button nor a direct form submit can place another order.
        expect(submitButton()).toBeDisabled();
        expect(submitButton()).toHaveTextContent("ثبت سفارش");
        expect(submitButton()).not.toHaveTextContent("در حال ثبت سفارش");
        fireEvent.submit(container.querySelector("form")!);
        expect(placeOrder).toHaveBeenCalledOnce();

        await act(async () => reload.resolve());
        expect(submitButton()).toBeEnabled();
    });

    it("says the cart is being updated, and blocks submitting, while the cart reloads", () => {
        cartState.isLoading = true;
        const {container} = render(<CheckoutForm />);

        fillValidForm();
        fireEvent.submit(container.querySelector("form")!);

        expect(screen.getByRole("status")).toHaveTextContent("در حال به‌روزرسانی سبد خرید");
        expect(submitButton()).toBeDisabled();
        expect(placeOrder).not.toHaveBeenCalled();
    });

    it("blocks submitting and offers a retry when the cart failed to reload", () => {
        cartState.loadError = "خطایی رخ داد.";
        const {container, rerender} = render(<CheckoutForm />);

        fillValidForm();
        fireEvent.submit(container.querySelector("form")!);

        expect(screen.getByRole("alert")).toHaveTextContent("سبد خرید به‌روز نشد");
        expect(submitButton()).toBeDisabled();
        expect(placeOrder).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", {name: "تلاش دوباره"}));
        expect(refresh).toHaveBeenCalledOnce();

        // Once the cart is current again, the shopper can submit; what they typed is still there.
        cartState.loadError = null;
        rerender(<CheckoutForm />);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(submitButton()).toBeEnabled();
        expect(screen.getByLabelText("نام")).toHaveValue("سارا");
    });

    it("shows a generic, dismissible error for a network failure", async () => {
        placeOrder.mockRejectedValue(new TypeError("Failed to fetch"));
        render(<CheckoutForm />);

        fillValidForm();
        submit();

        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("ثبت سفارش انجام نشد"));
        expect(refresh).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", {name: "بستن پیام خطا"}));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("treats a validation error naming none of the form's fields as a generic failure", async () => {
        placeOrder.mockRejectedValue(new OrderError("VALIDATION_ERROR", "Validation failed.", []));
        render(<CheckoutForm />);

        fillValidForm();
        submit();

        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("ثبت سفارش انجام نشد"));
    });
});
