import { CheckCircleIcon } from "@heroicons/react/24/solid";
import type { ReactNode } from "react";

export const FeaturesSectionItem = (props: { children: ReactNode }) => {
    const { children } = props;

    return (
        <div className="flex gap-2 items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 rounded-full" />
            {children}
        </div>
    );
};
