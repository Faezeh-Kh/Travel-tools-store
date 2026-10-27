import type {ReactNode} from "react";
import {CtaLink} from "@/components/CtaLink";
import {CheckCircleIcon} from "@/components/icons/CheckCircleIcon";
import {ClockIcon} from "@/components/icons/ClockIcon";
import {ShoppingBagIcon} from "@/components/icons/ShoppingBagIcon";
import {PrintButton} from "@/components/order/PrintButton";
import {formatDateTime, formatPrice} from "@/lib/format";
import type {Order, OrderStatus} from "@/lib/api/types";

const STATUS_LABELS: Record<OrderStatus, string> = {
    PENDING: "در انتظار تأیید",
    CONFIRMED: "تأییدشده",
    SHIPPED: "ارسال‌شده",
    DELIVERED: "تحویل‌شده",
    CANCELLED: "لغوشده",
};

// print:shadow-none - shadows print as grey smudges; print:break-inside-avoid keeps a card on one page.
const CARD_CLASS_NAME =
    "rounded-2xl border border-zinc-200 bg-background p-5 shadow-sm sm:p-6 dark:border-zinc-800 print:break-inside-avoid print:shadow-none";

function Card({labelledBy, className = "", children}: {labelledBy?: string; className?: string; children: ReactNode}) {
    return (
        <section aria-labelledby={labelledBy} className={`${CARD_CLASS_NAME} ${className}`}>
            {children}
        </section>
    );
}

// One label/value pair of the delivery details. dir="ltr" is for digit strings (phone number, postal code),
// which read left-to-right even on this RTL page. It is set on an inner span, not the <dd>, so the value
// still lines up on the right edge like the others.
function DetailRow({label, value, dir}: {label: string; value: string; dir?: "ltr"}) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="break-words">
                <span dir={dir}>{value}</span>
            </dd>
        </div>
    );
}

// What the shopper sees after placing an order, and whenever they reopen its link. Every value comes from
// the order itself - item names, variants, and prices are the purchase-time snapshots - so it stays correct
// even after the products change.
export function OrderConfirmation({order}: {order: Order}) {
    const itemCount = order.items.reduce((count, item) => count + item.quantity, 0);

    return (
        <div className="flex flex-col gap-6">
            <Card className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <CheckCircleIcon className="size-8" />
                </div>
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-bold sm:text-2xl">سفارش شما با موفقیت ثبت شد!</h1>
                    <p className="text-zinc-600 dark:text-zinc-400">از خرید شما سپاسگزاریم.</p>
                </div>
                <div className="flex w-full flex-col items-center gap-2 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900 print:border print:border-zinc-200">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">شماره سفارش</p>
                    <p dir="ltr" className="text-2xl font-bold tracking-wide sm:text-3xl">{order.orderNumber}</p>
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                        <ClockIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
                        <span className="sr-only">وضعیت: </span>
                        {STATUS_LABELS[order.status]}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">ثبت‌شده در {formatDateTime(order.createdAt)}</p>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                <Card labelledBy="order-items-heading" className="flex flex-col gap-4 md:col-span-3">
                    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                        <h2 id="order-items-heading" className="text-lg font-semibold">اقلام سفارش</h2>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {itemCount.toLocaleString("fa-IR")} کالا
                        </span>
                    </div>
                    <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
                        {order.items.map((item) => (
                            <li key={item.sku} className="flex items-start justify-between gap-4 py-3 first:pt-0">
                                <div className="flex min-w-0 flex-col gap-0.5">
                                    <p className="font-medium">{item.productName}</p>
                                    {item.variantDescription && (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.variantDescription}</p>
                                    )}
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {item.quantity.toLocaleString("fa-IR")} × {formatPrice(item.unitPrice)}
                                    </p>
                                </div>
                                <span className="shrink-0 whitespace-nowrap font-semibold">{formatPrice(item.totalPrice)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                        <span className="font-medium">مبلغ کل</span>
                        <span className="whitespace-nowrap text-xl font-bold">{formatPrice(order.totalPrice)}</span>
                    </div>
                </Card>

                <Card labelledBy="order-delivery-heading" className="flex flex-col gap-4 md:col-span-2">
                    <h2 id="order-delivery-heading" className="border-b border-zinc-200 pb-3 text-lg font-semibold dark:border-zinc-800">اطلاعات ارسال</h2>
                    <dl className="flex flex-col gap-3">
                        <DetailRow label="گیرنده" value={`${order.firstName} ${order.lastName}`} />
                        <DetailRow label="شماره موبایل" value={order.phoneNumber} dir="ltr" />
                        <DetailRow label="شهر" value={order.city} />
                        <DetailRow label="نشانی" value={order.address} />
                        <DetailRow label="کد پستی" value={order.postalCode} dir="ltr" />
                        {order.notes && <DetailRow label="توضیحات" value={order.notes} />}
                    </dl>
                </Card>
            </div>

            {/* Only useful on screen, so left out of the printout. */}
            <div className="flex flex-col items-center gap-4 print:hidden">
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <CtaLink href="/products" className="inline-flex items-center justify-center gap-2 py-2.5 font-semibold">
                        ادامه خرید
                        <ShoppingBagIcon className="size-5" />
                    </CtaLink>
                    <PrintButton />
                </div>
                {/* The link is the only way back to this page: there are no customer accounts, and the order
                    number alone deliberately can't open it (see README, "Order contract"). */}
                <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                    نشانی این صفحه را نگه دارید؛ برای مشاهده دوباره جزئیات سفارش به آن نیاز دارید.
                </p>
            </div>
        </div>
    );
}
