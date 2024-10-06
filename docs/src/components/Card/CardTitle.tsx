import type { DetailedHTMLProps, HTMLAttributes } from "react";

type Props = DetailedHTMLProps<
    HTMLAttributes<HTMLHeadingElement>,
    HTMLHeadingElement
>;

export const CardTitle = (props: Props) => {
    const { children, className, ...rest } = props;

    return (
        <span className={`mb-3 text-2xl font-semibold ${className}`} {...rest}>
            {children}
        </span>
    );
};
