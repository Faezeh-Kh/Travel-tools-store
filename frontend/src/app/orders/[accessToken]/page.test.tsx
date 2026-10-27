import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import type {Order} from "@/lib/api/types";

const {getOrder} = vi.hoisted(() => ({getOrder: vi.fn()}));

vi.mock("@/lib/api/orders", () => ({getOrder}));

import OrderConfirmationPage, {metadata} from "./page";

const sampleOrder: Order = {
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
    createdAt: "2026-10-27T10:00:00Z",
};

// The page is an async server component: calling it returns the JSX it renders, which the test then mounts.
async function renderPage(accessToken: string) {
    render(await OrderConfirmationPage({params: Promise.resolve({accessToken})} as PageProps<"/orders/[accessToken]">));
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("OrderConfirmationPage", () => {
    it("loads the order behind the token in the URL and confirms it", async () => {
        getOrder.mockResolvedValue(sampleOrder);

        await renderPage("22222222-2222-2222-2222-222222222222");

        expect(getOrder).toHaveBeenCalledExactlyOnceWith("22222222-2222-2222-2222-222222222222");
        expect(screen.getByRole("heading", {level: 1, name: "سفارش شما با موفقیت ثبت شد!"})).toBeInTheDocument();
        expect(screen.getByText("TT-100001")).toBeInTheDocument();
    });

    it("lets getOrder's not-found and other failures reach Next.js's not-found and error pages", async () => {
        const notFound = new Error("NEXT_NOT_FOUND");
        getOrder.mockRejectedValue(notFound);

        await expect(OrderConfirmationPage({
            params: Promise.resolve({accessToken: "unknown"}),
        } as PageProps<"/orders/[accessToken]">)).rejects.toBe(notFound);
    });

    it("keeps the page out of search engines and its URL out of other sites' referrer logs", () => {
        expect(metadata.robots).toEqual({index: false, follow: false});
        expect(metadata.referrer).toBe("no-referrer");
    });
});
