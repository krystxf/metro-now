import type { ElementType, ComponentPropsWithoutRef } from "react";

type Props = Exclude<ComponentPropsWithoutRef<"button">, "className"> & {
    as: ElementType;
};

const Button = (props: Props) => {
    const { children, className, as: Component = "button", ...rest } = props;

    return (
        <Component
            className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-6 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950"
            {...rest}
        >
            {children}
        </Component>
    );
};

export { Button };
