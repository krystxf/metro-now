import type { ReactNode } from "react";

type Props = {
    children: ReactNode;
};

export const FooterSection = (props: Props) => {
    const { children } = props;

    return <div className={"flex flex-col gap-2 max-w-48"}>{children}</div>;
};
