import {describe, expect, it} from "vitest";
import {render, screen, within} from "@testing-library/react";
import {formatDateTime, formatPrice} from "@/lib/format";
import type {Order} from "@/lib/api/types";
import {OrderConfirmation} from "./OrderConfirmation";

function order(overrides: Partial<Order> = {}): Order {
    return {
        orderNumber: "TT-100001",
        accessToken: "22222222-2222-2222-2222-222222222222",
        status: "PENDING",
        firstName: "سارا",
        lastName: "محمدی",
        phoneNumber: "09121234567",
        address: "خیابان آزادی، پلاک ۱۰",
        city: "تهران",
        postalCode: "1234567890",
        notes: "زنگ نزنید",
        items: [
            {
                productName: "چادر کوهنوردی ۳ نفره",
                variantDescription: "رنگ: سبز",
                productImage: null,
                sku: "TENT-3P-GRN",
                quantity: 2,
                unitPrice: 4850000,
                totalPrice: 9700000,
            },
            {
                productName: "صندلی تاشو کمپینگ",
                variantDescription: "",
                productImage: null,
                sku: "CHAIR-FOLD-STD",
                quantity: 1,
                unitPrice: 950000,
                totalPrice: 950000,
            },
        ],
        totalPrice: 10650000,
        createdAt: "2026-10-27T10:00:00Z",
        ...overrides,
    };
}

function itemsSection() {
    return screen.getByRole("region", {name: "اقلام سفارش"});
}

function deliverySection() {
    return screen.getByRole("region", {name: "اطلاعات ارسال"});
}

describe("OrderConfirmation", () => {
    it("confirms the order with a heading, its number, when it was placed, and its status in Persian", () => {
        render(<OrderConfirmation order={order()} />);

        expect(screen.getByRole("heading", {level: 1, name: "سفارش شما با موفقیت ثبت شد!"})).toBeInTheDocument();
        expect(screen.getByText("TT-100001")).toBeInTheDocument();
        expect(screen.getByText(`ثبت‌شده در ${formatDateTime("2026-10-27T10:00:00Z")}`)).toBeInTheDocument();
        // "وضعیت:" is visually hidden; a screen reader announces it before the status.
        expect(screen.getByText("در انتظار تأیید")).toHaveTextContent("وضعیت: در انتظار تأیید");
    });

    it.each([
        ["CONFIRMED", "تأییدشده"],
        ["SHIPPED", "ارسال‌شده"],
        ["DELIVERED", "تحویل‌شده"],
        ["CANCELLED", "لغوشده"],
    ] as const)("labels the %s status in Persian", (status, label) => {
        render(<OrderConfirmation order={order({status})} />);

        expect(screen.getByText(label)).toHaveTextContent(`وضعیت: ${label}`);
    });

    it("lists each item's snapshot with its variant, quantity, unit price, and line total, and the order total", () => {
        render(<OrderConfirmation order={order()} />);

        const items = within(itemsSection()).getAllByRole("listitem");
        expect(items).toHaveLength(2);
        expect(items[0]).toHaveTextContent("چادر کوهنوردی ۳ نفره");
        expect(items[0]).toHaveTextContent("رنگ: سبز");
        expect(items[0]).toHaveTextContent(`۲ × ${formatPrice(4850000)}`);
        expect(items[0]).toHaveTextContent(formatPrice(9700000));
        expect(itemsSection()).toHaveTextContent(`مبلغ کل${formatPrice(10650000)}`);
    });

    it("counts units, not lines, in the items heading", () => {
        render(<OrderConfirmation order={order()} />);

        // Two tents and one chair.
        expect(itemsSection()).toHaveTextContent("۳ کالا");
    });

    it("shows no variant line for an item without variant attributes", () => {
        render(<OrderConfirmation order={order()} />);

        const chair = within(itemsSection()).getAllByRole("listitem")[1];
        // Name, "quantity × unit price", and line total - nothing in between.
        expect(chair.textContent).toBe(`صندلی تاشو کمپینگ۱ × ${formatPrice(950000)}${formatPrice(950000)}`);
    });

    it("shows the delivery details, with digit strings reading left-to-right", () => {
        render(<OrderConfirmation order={order()} />);

        const delivery = deliverySection();
        expect(delivery).toHaveTextContent("سارا محمدی");
        expect(delivery).toHaveTextContent("تهران");
        expect(delivery).toHaveTextContent("خیابان آزادی، پلاک ۱۰");
        expect(within(delivery).getByText("09121234567")).toHaveAttribute("dir", "ltr");
        expect(within(delivery).getByText("1234567890")).toHaveAttribute("dir", "ltr");
        expect(delivery).toHaveTextContent("زنگ نزنید");
    });

    it("leaves out the notes row when the order has no notes", () => {
        render(<OrderConfirmation order={order({notes: null})} />);

        expect(within(deliverySection()).queryByText("توضیحات")).not.toBeInTheDocument();
    });

    it("links to the products page to continue shopping, offers printing, and reminds the shopper to keep the link", () => {
        render(<OrderConfirmation order={order()} />);

        expect(screen.getByRole("link", {name: "ادامه خرید"})).toHaveAttribute("href", "/products");
        expect(screen.getByRole("button", {name: "چاپ / ذخیره PDF"})).toBeInTheDocument();
        expect(screen.getByText(/نشانی این صفحه را نگه دارید/)).toBeInTheDocument();
    });
});
