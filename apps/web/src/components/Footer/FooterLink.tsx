import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
};

export const FooterLink = (props: Props) => {
    return (
        <Link
            {...props}
            className="dark:text-neutral-400 text-sm  text-neutral-500 dark:hover:text-neutral-200 hover:text-neutral-900 flex gap-2 items-center transition-all ease-in-out hover:underline"
        />
    );
};
