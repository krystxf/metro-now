import { Either, Schema } from "effect";
import { type DelaySchema, delaySchema } from "src/schema/delay.schema";

export const getDelayInSeconds = (delay: DelaySchema): number => {
    const parsed = Schema.decodeUnknownEither(delaySchema)(delay);

    if (Either.isLeft(parsed)) {
        return 0;
    }

    if (!parsed.right.is_available) {
        return 0;
    }

    let seconds = 0;

    if (typeof parsed.right.seconds === "number") {
        seconds += parsed.right.seconds;
    }
    if (typeof parsed.right.minutes === "number") {
        seconds += parsed.right.minutes * 60;
    }

    return seconds;
};
