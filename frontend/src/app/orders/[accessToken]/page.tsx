import type {Metadata} from "next";
import {getOrder} from "@/lib/api/orders";
import {OrderConfirmation} from "@/components/order/OrderConfirmation";

// The access token in this page's URL is what protects the shopper's name, phone number, and address:
// - noindex/nofollow: search engines must never list an order page.
// - no-referrer: following any link on this page must not send the URL, token included, to another site.
// A fixed title rather than generateMetadata with the order number: that would fetch the order a second time.
export const metadata: Metadata = {
    title: "تأیید سفارش",
    robots: {index: false, follow: false},
    referrer: "no-referrer",
};

// getOrder renders the not-found page for an unknown or malformed token, and throws for any other failure,
// which the app's error page handles. It is never cached, so one shopper's order can't be served to another.
export default async function OrderConfirmationPage({params}: PageProps<"/orders/[accessToken]">) {
    const {accessToken} = await params;
    const order = await getOrder(accessToken);

    return (
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-4 pb-8 sm:px-6 lg:pt-8 print:p-0">
            <OrderConfirmation order={order} />
        </main>
    );
}
