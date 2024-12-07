import type { AnchorHTMLAttributes } from "react";
import Link from "next/link";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export const NavbarLink = (props: Props) => {
    return (
        <Link
            {...props}
            className="dark:text-neutral-400 dark:hover:text-neutral-200 text-neutral-500 hover:text-neutral-900 transition-all ease-in-out"
        />
    );
};
