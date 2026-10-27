import {CtaLink} from "@/components/CtaLink";

// Says nothing about why: an unknown token and a malformed one look the same, so the page gives no hint
// about which tokens exist.
export default function NotFound() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center sm:p-8">
            <p className="text-lg font-semibold">سفارشی با این نشانی یافت نشد.</p>
            <CtaLink href="/products">مشاهده محصولات</CtaLink>
        </div>
    );
}
