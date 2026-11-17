"use client";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 px-4 text-black dark:bg-black dark:text-white">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center max-w-md">
                {error.message || "An unexpected error occurred"}
            </p>
            <button
                type="button"
                onClick={reset}
                className="text-white text-sm font-medium hover:underline"
            >
                Try again
            </button>
        </div>
    );
}
