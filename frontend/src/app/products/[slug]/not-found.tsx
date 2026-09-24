import {CtaLink} from "@/components/CtaLink";

export default function NotFound() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center sm:p-8">
            <p className="text-lg font-semibold">این محصول یافت نشد.</p>
            <CtaLink href="/products">بازگشت به محصولات</CtaLink>
        </div>
    );
}
