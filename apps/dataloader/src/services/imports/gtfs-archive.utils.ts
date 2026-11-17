import { Open as unzipperOpen } from "unzipper";

import { parseCsvString } from "../../utils/csv.utils";
import { fetchWithTimeout } from "../../utils/fetch.utils";

type GtfsRow = Record<string, string>;

export type GtfsArchive = {
    agencies: GtfsRow[];
    routes: GtfsRow[];
    stops: GtfsRow[];
    stopTimes: GtfsRow[];
    trips: GtfsRow[];
    calendars: GtfsRow[];
    calendarDates: GtfsRow[];
    transfers: GtfsRow[];
    frequencies: GtfsRow[];
};

export async function fetchAndParseGtfsArchive(args: {
    url: string;
    archiveLabel: string;
    requireAgency?: boolean;
}): Promise<GtfsArchive> {
    const response = await fetchWithTimeout(args.url);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch ${args.archiveLabel} GTFS archive: ${response.status} ${response.statusText}`,
        );
    }

    const directory = await unzipperOpen.buffer(
        Buffer.from(await response.arrayBuffer()),
    );

    const readFile = async (path: string): Promise<string> => {
        const file = directory.files.find((entry) => entry.path === path);

        if (!file) {
            throw new Error(
                `${args.archiveLabel} GTFS archive is missing '${path}'`,
            );
        }

        return file.buffer().then((buf) => buf.toString());
    };

    const readOptionalFile = async (path: string): Promise<string | null> => {
        const file = directory.files.find((entry) => entry.path === path);

        if (!file) return null;

        return file.buffer().then((buf) => buf.toString());
    };

    const agencyReader = args.requireAgency
        ? readFile("agency.txt")
        : readOptionalFile("agency.txt");

    const [
        agencyCsv,
        routesCsv,
        stopsCsv,
        stopTimesCsv,
        tripsCsv,
        calendarCsv,
        calendarDatesCsv,
        transfersCsv,
        frequenciesCsv,
    ] = await Promise.all([
        agencyReader,
        readFile("routes.txt"),
        readFile("stops.txt"),
        readFile("stop_times.txt"),
        readFile("trips.txt"),
        readOptionalFile("calendar.txt"),
        readOptionalFile("calendar_dates.txt"),
        readOptionalFile("transfers.txt"),
        readOptionalFile("frequencies.txt"),
    ]);

    const parseOptional = async (csv: string | null): Promise<GtfsRow[]> =>
        csv === null ? [] : parseCsvString<GtfsRow>(csv);

    const [agencies, routes, stops, stopTimes, trips] = await Promise.all([
        parseOptional(agencyCsv),
        parseCsvString<GtfsRow>(routesCsv),
        parseCsvString<GtfsRow>(stopsCsv),
        parseCsvString<GtfsRow>(stopTimesCsv),
        parseCsvString<GtfsRow>(tripsCsv),
    ]);

    const [calendars, calendarDates, transfers, frequencies] =
        await Promise.all([
            parseOptional(calendarCsv),
            parseOptional(calendarDatesCsv),
            parseOptional(transfersCsv),
            parseOptional(frequenciesCsv),
        ]);

    return {
        agencies,
        routes,
        stops,
        stopTimes,
        trips,
        calendars,
        calendarDates,
        transfers,
        frequencies,
    };
}
