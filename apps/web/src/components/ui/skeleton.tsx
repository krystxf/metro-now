export const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 ${className ?? ""}`} />
);
