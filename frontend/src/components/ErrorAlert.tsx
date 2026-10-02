import type {ReactNode} from "react";
import {CloseIcon} from "@/components/icons/CloseIcon";

export function ErrorAlert({
    children,
    onDismiss,
    className = "",
}: {
    children: ReactNode;
    // Omit to show a plain, non-dismissible alert.
    onDismiss?: () => void;
    className?: string;
}) {
    return (
        <div
            role="alert"
            // self-start: hugs its own content instead of stretching to fill a flex/grid parent - that
            // stretching was what pushed the dismiss button away from the message in the first place.
            className={`flex w-fit max-w-full items-start gap-2 self-start rounded-lg border border-red-200 bg-gradient-to-l from-red-50 to-red-100 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:from-red-950 dark:to-red-900 dark:text-red-300 ${className}`}
        >
            <p>{children}</p>
            {onDismiss && (
                // order-first: visually first (the right edge under this site's RTL), while staying after
                // the message in DOM/tab order so a screen reader announces the error before the action.
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="بستن پیام خطا"
                    className="order-first shrink-0 rounded text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
                >
                    <CloseIcon className="size-4" />
                </button>
            )}
        </div>
    );
}
