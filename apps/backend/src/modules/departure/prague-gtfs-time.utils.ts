const PRAGUE_TIME_ZONE = "Europe/Prague";

type PragueDateTimeParts = {
    date: string;
    time: string;
};

type PragueDateTuple = {
    year: number;
    month: number;
    day: number;
};

const getPragueDateTimeParts = (date: Date): PragueDateTimeParts => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: PRAGUE_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const values = Object.fromEntries(
        formatter
            .formatToParts(date)
            .flatMap((part) =>
                part.type !== "literal" ? [[part.type, part.value]] : [],
            ),
    );

    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}:${values.second}`,
    };
};

const parsePragueDate = (value: string): PragueDateTuple => {
    const [year, month, day] = value.split("-").map((part) => Number(part));

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)
    ) {
        throw new Error(`Invalid Prague date '${value}'`);
    }

    return { year, month, day };
};

const formatGtfsDate = ({ year, month, day }: PragueDateTuple): string =>
    `${String(year).padStart(4, "0")}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;

const parseGtfsDate = (value: string): PragueDateTuple => {
    const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);

    if (!match) {
        throw new Error(`Invalid GTFS date '${value}'`);
    }

    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
    };
};

const addDays = (date: PragueDateTuple, dayDelta: number): PragueDateTuple => {
    const next = new Date(
        Date.UTC(date.year, date.month - 1, date.day + dayDelta, 12, 0, 0),
    );

    return {
        year: next.getUTCFullYear(),
        month: next.getUTCMonth() + 1,
        day: next.getUTCDate(),
    };
};

export const parseGtfsTimeToSeconds = (value: string): number | null => {
    const trimmed = value.trim();
    const match = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(trimmed);

    if (!match) {
        return null;
    }

    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
};

const parseTimezoneOffsetMs = (offset: string): number => {
    const match = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(offset);

    if (!match) {
        return 0;
    }

    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? "0");

    return sign * (hours * 60 + minutes) * 60_000;
};

const getTimezoneOffsetMs = (date: Date, timeZone: string): number => {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "shortOffset",
        year: "numeric",
    });
    const part = formatter
        .formatToParts(date)
        .find((item) => item.type === "timeZoneName")?.value;

    return parseTimezoneOffsetMs(part ?? "GMT+0");
};

export const toPragueDateFromGtfs = ({
    gtfsDate,
    timeSeconds,
}: {
    gtfsDate: string;
    timeSeconds: number;
}): Date => {
    const date = parseGtfsDate(gtfsDate);
    const hours = Math.floor(timeSeconds / 3600);
    const minutes = Math.floor((timeSeconds % 3600) / 60);
    const seconds = timeSeconds % 60;
    const localMillis = Date.UTC(
        date.year,
        date.month - 1,
        date.day,
        hours,
        minutes,
        seconds,
    );
    let utcGuess = localMillis;

    for (let index = 0; index < 3; index += 1) {
        const offsetMs = getTimezoneOffsetMs(
            new Date(utcGuess),
            PRAGUE_TIME_ZONE,
        );
        const candidate = localMillis - offsetMs;

        if (candidate === utcGuess) {
            break;
        }

        utcGuess = candidate;
    }

    return new Date(utcGuess);
};

export const getGtfsServiceDatesForWindow = ({
    start,
    end,
}: {
    start: Date;
    end: Date;
}): string[] => {
    const startDate = parsePragueDate(getPragueDateTimeParts(start).date);
    const endDate = parsePragueDate(getPragueDateTimeParts(end).date);
    const dates: string[] = [];
    let cursor = addDays(startDate, -1);
    const endPlusOne = addDays(endDate, 1);

    while (
        Date.UTC(cursor.year, cursor.month - 1, cursor.day) <=
        Date.UTC(endPlusOne.year, endPlusOne.month - 1, endPlusOne.day)
    ) {
        dates.push(formatGtfsDate(cursor));
        cursor = addDays(cursor, 1);
    }

    return dates;
};

export type GtfsWeekday =
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";

export const getWeekdayFromGtfsDate = (gtfsDate: string): GtfsWeekday => {
    const date = parseGtfsDate(gtfsDate);
    const dayOfWeek = new Date(
        Date.UTC(date.year, date.month - 1, date.day),
    ).getUTCDay();

    switch (dayOfWeek) {
        case 0:
            return "sunday";
        case 1:
            return "monday";
        case 2:
            return "tuesday";
        case 3:
            return "wednesday";
        case 4:
            return "thursday";
        case 5:
            return "friday";
        default:
            return "saturday";
    }
};
