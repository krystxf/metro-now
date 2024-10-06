import type { DetailedHTMLProps, HTMLAttributes } from "react";

type Props = DetailedHTMLProps<
    HTMLAttributes<HTMLParagraphElement>,
    HTMLParagraphElement
>;

export const CardContent = (props: Props) => {
    const { children, className, ...rest } = props;

    return (
        <div className={`m-0 max-w-[30ch] text-sm ${className}`} {...rest}>
            {children}
        </div>
    );
};
