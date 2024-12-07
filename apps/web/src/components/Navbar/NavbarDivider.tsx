import { twMerge } from "@/utils/tw-merge.utils";
import { navbarTransitionClassname } from "@/components/Navbar/navbar.utils";

type Props = {
    expanded: boolean;
};

export const NavbarDivider = (props: Props) => {
    const { expanded } = props;

    return (
        <div
            className={twMerge(
                "border-r border-neutral-200 dark:border-neutral-600 h-6",
                navbarTransitionClassname,
                expanded ? "opacity-0" : "opacity-100",
            )}
        />
    );
};
