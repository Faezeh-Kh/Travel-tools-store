export function ChevronIcon({direction, className}: {direction: "left" | "right"; className?: string}) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <polyline points={direction === "left" ? "15 6 9 12 15 18" : "9 6 15 12 9 18"} />
        </svg>
    );
}
