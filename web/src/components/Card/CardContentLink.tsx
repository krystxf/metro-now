import type { AnchorHTMLAttributes, DetailedHTMLProps } from "react";

type Props = DetailedHTMLProps<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
>;

export const CardContentLink = (props: Props) => {
    const { children, className, ...rest } = props;

    return (
        <a className={`px-5 ${className}`} {...rest}>
            <div className="group text-sm font-semibold">{children}</div>
        </a>
    );
};
