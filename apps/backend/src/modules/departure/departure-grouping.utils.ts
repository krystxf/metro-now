import { group } from "radash";

import type { DepartureSchema } from "src/modules/departure/schema/departure.schema";

export const limitDeparturesPerRoute = (
    departures: DepartureSchema[],
    limit: number,
): DepartureSchema[] => {
    const groupedDepartures = group(
        departures,
        (departure) => `${departure.platformCode}-${departure.route}`,
    );
    const groupedDeparturesValues = Object.values(groupedDepartures);

    return groupedDeparturesValues.flatMap((grouped) =>
        (grouped ?? []).slice(0, limit),
    );
};
