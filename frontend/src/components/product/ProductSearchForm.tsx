"use client";

import Form from "next/form";
import {SearchField} from "@/components/product/SearchField";

export function ProductSearchForm({defaultValue, className}: {defaultValue?: string; className?: string}) {
    return (
        <Form action="/products" className={className}>
            <SearchField defaultValue={defaultValue} />
        </Form>
    );
}
