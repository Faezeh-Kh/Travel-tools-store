"use client";

import {ErrorState} from "@/components/ErrorState";

export default function Error({
    retry,
}: {
    error: Error & {digest?: string};
    retry: () => void;
}) {
    return <ErrorState message="مشکلی در بارگذاری محصولات پیش آمد." retry={retry} />;
}
