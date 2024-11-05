import Link, { LinkProps } from "next/link";
import type { AnchorHTMLAttributes, DetailedHTMLProps } from "react";

type Props = LinkProps &
    DetailedHTMLProps<
        AnchorHTMLAttributes<HTMLAnchorElement>,
        HTMLAnchorElement
    >;

export const CardContentLink = (props: Props) => {
    const { children, className, ...rest } = props;

    return (
        <Link className={`px-5 ${className}`} {...rest}>
            <div className="group text-sm font-semibold flex items-center gap-1">
                {children}
            </div>
        </Link>
    );
};
