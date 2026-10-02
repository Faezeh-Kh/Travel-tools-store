import {Fragment} from "react";

// Description and specifications below the image/info row, side by side at desktop so each gets a
// readable column instead of one stretched-wide block. Nothing is rendered when the product has neither.
// A synchronous component of its own (not inlined in the async product page) so it stays unit-testable -
// see the Next.js docs note in the frontend README on why async Server Components aren't.
export function ProductDetailsPanel({
    description,
    specifications,
}: {
    description: string;
    specifications: Record<string, string>;
}) {
    const specificationEntries = Object.entries(specifications);
    if (!description && specificationEntries.length === 0) return null;

    return (
        <div className="grid grid-cols-1 gap-8 border-t border-zinc-200 pt-8 lg:grid-cols-2 dark:border-zinc-800">
            {description && (
                <section aria-labelledby="product-description-heading" className="flex flex-col gap-3">
                    <h2 id="product-description-heading" className="text-lg font-bold">
                        توضیحات
                    </h2>
                    <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
                </section>
            )}
            {specificationEntries.length > 0 && (
                <section aria-labelledby="product-specifications-heading" className="flex flex-col gap-3">
                    <h2 id="product-specifications-heading" className="text-lg font-bold">
                        مشخصات
                    </h2>
                    {/* A single shared grid (not one grid per row) is what lets every dt/dd pair align into
                        the same two columns - a Fragment keeps each pair keyed without an extra wrapper. */}
                    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                        {specificationEntries.map(([key, value]) => (
                            <Fragment key={key}>
                                <dt className="text-zinc-500">{key}</dt>
                                <dd className="font-medium">{value}</dd>
                            </Fragment>
                        ))}
                    </dl>
                </section>
            )}
        </div>
    );
}
