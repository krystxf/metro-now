import type { ReactNode } from "react";
import { twMerge } from "@/utils/tw-merge.utils";

type Props = {
    children: ReactNode;
    className?: string;
};

export const FooterSectionHeading = (props: Props) => {
    const { className, children } = props;

    return (
        <span
            className={twMerge(
                "text-neutral-700 font-semibold dark:text-neutral-400 flex items-center gap-2",
                className,
            )}
        >
            {children}
        </span>
    );
};
