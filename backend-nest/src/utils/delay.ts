import { delaySchema, type DelaySchema } from "src/schema/delay.schema";

export const getDelayInSeconds = (delay: DelaySchema): number => {
    const parsed = delaySchema.safeParse(delay);

    if (!parsed.success) {
        console.log("Invalid delay", delay);
        return 0;
    }

    if (!parsed.data.is_available) {
        return 0;
    }

    let seconds = 0;

    if (typeof parsed.data.seconds === "number") {
        seconds += parsed.data.seconds;
    }
    if (typeof parsed.data.minutes === "number") {
        seconds += parsed.data.minutes * 60;
    }

    return seconds;
};
