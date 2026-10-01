"use client";

import {useSearchParams} from "next/navigation";
import {ProductSearchForm} from "@/components/layout/ProductSearchForm";

export function HeaderSearch({className}: {className?: string}) {
    const search = useSearchParams().get("search") ?? "";

    // The header lives in the root layout and is not remounted on navigation, so the key resets the
    // uncontrolled input whenever the URL's search term changes.
    return <ProductSearchForm key={search} defaultValue={search} className={className} />;
}
