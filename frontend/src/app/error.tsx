"use client";

import {ErrorState} from "@/components/ErrorState";

export default function Error({
    retry,
}: {
    error: Error & {digest?: string};
    retry: () => void;
}) {
    return <ErrorState message="مشکلی در بارگذاری صفحه پیش آمد." retry={retry} />;
}
