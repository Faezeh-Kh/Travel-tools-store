"use client";

export function ErrorState({message, retry}: {message: string; retry: () => void}) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center sm:p-8">
            <p className="text-lg font-semibold">{message}</p>
            <button
                onClick={() => retry()}
                className="rounded-full bg-accent px-5 py-2 text-accent-foreground transition-colors hover:bg-accent-hover active:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
                تلاش دوباره
            </button>
        </div>
    );
}
