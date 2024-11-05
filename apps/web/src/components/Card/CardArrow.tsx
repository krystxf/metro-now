import { ChevronRightIcon } from "@heroicons/react/24/solid";

type Props = {
    className?: string;
};

export const CardArrow = (props: Props) => {
    const { className } = props;

    return (
        <ChevronRightIcon
            className={`transition-transform group-hover:translate-x-1 motion-reduce:transform-none h-3 ${className}`}
        />
    );
};
