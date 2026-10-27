"use client";

import {PrinterIcon} from "@/components/icons/PrinterIcon";

// Opens the browser's print dialog, which also offers "Save as PDF" - so no PDF library is needed. A client
// component only because window exists in the browser alone; the confirmation page around it stays on the
// server. What gets printed is decided by the print: styles on the page (and in globals.css).
export function PrintButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 font-medium hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
            چاپ / ذخیره PDF
            <PrinterIcon className="size-5" />
        </button>
    );
}
