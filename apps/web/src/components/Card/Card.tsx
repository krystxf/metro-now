import type { DetailedHTMLProps, HTMLAttributes } from "react";

type Props = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export const Card = (props: Props) => {
    const { children, className, ...rest } = props;

    return (
        <div
            className={`rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-neutral-950 ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
};
