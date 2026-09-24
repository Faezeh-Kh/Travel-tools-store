import Link from "next/link";
import type {ComponentProps} from "react";

export function CtaLink({className = "", ...props}: ComponentProps<typeof Link>) {
    return (
        <Link
            {...props}
            className={`rounded-full bg-accent px-5 py-2 text-accent-foreground transition-colors hover:bg-accent-hover active:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
        />
    );
}
