export function CheckCircleIcon({className}: {className?: string}) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="8 12.5 11 15.5 16 9.5" />
        </svg>
    );
}
