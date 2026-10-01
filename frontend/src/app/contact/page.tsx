import type {Metadata} from "next";
import type {ReactNode} from "react";
import {ClockIcon} from "@/components/icons/ClockIcon";
import {MailIcon} from "@/components/icons/MailIcon";
import {MapPinIcon} from "@/components/icons/MapPinIcon";
import {PhoneIcon} from "@/components/icons/PhoneIcon";
import {TelegramIcon} from "@/components/icons/TelegramIcon";

export const metadata: Metadata = {
    title: "تماس با ما",
    description: "اطلاعات تماس فروشگاه ابزار سفر: آدرس، شماره تماس و ایمیل.",
};

// All contact details in one place, so they are edited here rather than throughout the markup.
const CONTACT = {
    address: "سمنان، شاهرود، میدان امام، پاساژ ونوس، طبقه سوم",
    location: {latitude: 36.4238444873952, longitude: 54.96796526934596},
    neshanUrl: "https://nshn.ir/ae_b1wwMyGy3PV",
    openingDays: "هر روز به جز تعطیلات رسمی",
    openingHours: [
        {label: "صبح", hours: "۹:۳۰ تا ۱۳:۰۰ (به جز جمعه‌ها)"},
        {label: "عصر", hours: "۱۷:۰۰ تا ۲۱:۰۰"},
    ],
    phone: {display: "+98 930 735 0368", href: "tel:+989307350368"},
    email: "khorram.faezeh@gmail.com",
    telegram: {display: "@abzarsafar62", href: "https://t.me/abzarsafar62"},
};

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

// OpenStreetMap's embeddable map: a small bounding box (min lon, min lat, max lon, max lat) around the shop,
// roughly street level, with a marker on the shop itself.
function openStreetMapEmbedUrl({latitude, longitude}: {latitude: number; longitude: number}): string {
    const bbox = [longitude - 0.006, latitude - 0.003, longitude + 0.006, latitude + 0.003]
        .map((value) => value.toFixed(5))
        .join(",");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

function SectionHeading({id, icon, children}: {id: string; icon: ReactNode; children: ReactNode}) {
    return (
        <h2 id={id} className="flex items-center gap-2 text-lg font-semibold">
            <span className="text-accent">{icon}</span>
            {children}
        </h2>
    );
}

function ShopAddressSection() {
    return (
        <section aria-labelledby="shop-address-heading" className="flex flex-col gap-3">
            <SectionHeading id="shop-address-heading" icon={<MapPinIcon className="size-5" />}>
                آدرس فروشگاه
            </SectionHeading>
            <address className="not-italic text-zinc-600 dark:text-zinc-400">{CONTACT.address}</address>
            {/* lazy: the map only loads when scrolled near; no-referrer: OpenStreetMap is not told which page
                embedded it. */}
            <iframe
                src={openStreetMapEmbedUrl(CONTACT.location)}
                title="نقشه موقعیت فروشگاه"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-72 w-full rounded-2xl border border-zinc-200 sm:h-90 dark:border-zinc-800"
            />
            {/* The vertical padding keeps the small link's tap target at least 24px tall on phones. */}
            <a
                href={CONTACT.neshanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex w-fit items-center gap-1 rounded py-1 text-sm text-accent hover:underline ${FOCUS_RING}`}
            >
                <MapPinIcon className="size-4" />
                مسیریابی با نشان
            </a>
        </section>
    );
}

function OpeningHoursSection() {
    return (
        // Divider lines above and below set the hours apart from the map and the contact cards.
        <section
            aria-labelledby="opening-hours-heading"
            className="my-2 flex flex-col gap-3 border-y border-zinc-200 py-6 dark:border-zinc-800"
        >
            <SectionHeading id="opening-hours-heading" icon={<ClockIcon className="size-5" />}>
                ساعات کاری
            </SectionHeading>
            <p className="text-zinc-600 dark:text-zinc-400">{CONTACT.openingDays}</p>
            <dl className="flex flex-wrap gap-x-8 gap-y-2 text-zinc-600 dark:text-zinc-400">
                {CONTACT.openingHours.map(({label, hours}) => (
                    <div key={label} className="flex gap-2">
                        <dt>{label}:</dt>
                        <dd className="font-semibold text-foreground">{hours}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function ContactCard({
    href,
    icon,
    label,
    value,
    external = false,
}: {
    href: string;
    icon: ReactNode;
    label: string;
    value: string;
    external?: boolean;
}) {
    return (
        // The whole card is the link, giving a large tap target. Below lg it is a compact row (icon beside the
        // text) so three stacked cards stay short on phones; from lg the cards sit side by side, centered.
        <a
            href={href}
            {...(external ? {target: "_blank", rel: "noopener noreferrer"} : {})}
            className={`flex items-center gap-4 rounded-2xl bg-zinc-50 p-4 transition-colors hover:bg-zinc-100 lg:flex-col lg:gap-3 lg:p-6 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${FOCUS_RING}`}
        >
            <span className="text-accent">{icon}</span>
            <span className="flex flex-col items-start gap-1 lg:items-center lg:gap-3">
                <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
                {/* Phone numbers, emails and handles are left-to-right text inside the RTL page. */}
                <span dir="ltr" className="font-semibold">
                    {value}
                </span>
            </span>
        </a>
    );
}

function ContactCards() {
    return (
        <div className="grid gap-4 lg:grid-cols-3">
            <ContactCard
                href={CONTACT.phone.href}
                icon={<PhoneIcon className="size-7" />}
                label="تلفن تماس"
                value={CONTACT.phone.display}
            />
            <ContactCard
                href={`mailto:${CONTACT.email}`}
                icon={<MailIcon className="size-7" />}
                label="ایمیل"
                value={CONTACT.email}
            />
            <ContactCard
                href={CONTACT.telegram.href}
                icon={<TelegramIcon className="size-7 fill-current" />}
                label="تلگرام"
                value={CONTACT.telegram.display}
                external
            />
        </div>
    );
}

export default function ContactPage() {
    return (
        <main className="mx-auto flex w-full max-w-[1536px] flex-1 flex-col gap-4 px-4 pt-4 pb-8 sm:px-6 lg:px-8 lg:pt-6">
            <h1 className="text-2xl font-bold">تماس با ما</h1>
            <ShopAddressSection />
            <OpeningHoursSection />
            <ContactCards />
        </main>
    );
}
