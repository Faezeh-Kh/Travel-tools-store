// Shown when the cart couldn't be loaded, by the cart and checkout pages alike. onRetry re-runs the load.
export function CartLoadError({message, onRetry}: {message: string; onRetry: () => void}) {
    return (
        <div className="flex flex-col items-start gap-3 text-zinc-500 dark:text-zinc-400">
            <p>{message}</p>
            <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-accent px-5 py-2 text-accent-foreground hover:bg-accent-hover"
            >
                تلاش دوباره
            </button>
        </div>
    );
}
