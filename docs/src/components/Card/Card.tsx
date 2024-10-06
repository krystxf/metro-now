import type { DetailedHTMLProps, HTMLAttributes } from "react";

type Props = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export const Card = (props: Props) => {
    const { children, className, ...rest } = props;

    return (
        <div
            className={`rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-50 ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
};
