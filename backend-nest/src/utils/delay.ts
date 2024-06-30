import { Delay } from "../types/types";

export const getDelayInSeconds = (delay?: Delay | null): number => {
    if (!delay) {
        return 0;
    }

    let seconds = 0;

    if (typeof delay?.seconds === "number") {
        seconds += delay.seconds;
    }
    if (typeof delay?.minutes === "number") {
        seconds += delay.minutes * 60;
    }

    return seconds;
};
