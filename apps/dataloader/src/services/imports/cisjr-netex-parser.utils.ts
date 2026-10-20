import { XMLParser } from "fast-xml-parser";

export type NeTExOperator = {
    id: string;
    publicCode: string;
    legalName: string;
};

export type NeTExStopPlace = {
    id: string;
    name: string;
    cisCode: string | null;
};

export type NeTExLine = {
    id: string;
    name: string;
    shortName: string | null;
    publicCode: string | null;
    transportMode: string;
    operatorRef: string;
};

export type NeTExStopPointInPattern = {
    id: string;
    order: number;
    scheduledStopPointRef: string;
};

export type NeTExJourneyPattern = {
    id: string;
    lineRef: string;
    stops: NeTExStopPointInPattern[];
};

export type NeTExPassingTime = {
    stopPointRef: string;
    arrivalTime: string | null;
    departureTime: string | null;
    arrivalDayOffset: number;
    departureDayOffset: number;
};

export type NeTExServiceJourney = {
    id: string;
    dayTypeRefs: string[];
    journeyPatternRef: string;
    operatorRef: string | null;
    transportMode: string | null;
    passingTimes: NeTExPassingTime[];
    plannedTransportId: string | null;
    relatedPlannedTransportIds: string[];
};

export type NeTExUicOperatingPeriod = {
    id: string;
    fromDate: string;
    toDate: string;
    validDayBits: string;
};

export type NeTExDayTypeAssignment = {
    dayTypeRef: string;
    operatingPeriodRef: string;
};

export type NeTExScheduledStopPoint = {
    id: string;
    name: string;
};

export type NeTExStopAssignment = {
    scheduledStopPointRef: string;
    stopPlaceRef: string;
};

export type ParsedNeTExFile = {
    operators: NeTExOperator[];
    stopPlaces: NeTExStopPlace[];
    lines: NeTExLine[];
    scheduledStopPoints: NeTExScheduledStopPoint[];
    stopAssignments: NeTExStopAssignment[];
    journeyPatterns: NeTExJourneyPattern[];
    serviceJourneys: NeTExServiceJourney[];
    dayTypeIds: string[];
    operatingPeriods: NeTExUicOperatingPeriod[];
    dayTypeAssignments: NeTExDayTypeAssignment[];
};

const ARRAY_ELEMENT_NAMES = new Set([
    "Operator",
    "StopPlace",
    "Line",
    "ScheduledStopPoint",
    "PassengerStopAssignment",
    "ServiceJourneyPattern",
    "StopPointInJourneyPattern",
    "ServiceJourney",
    "DayType",
    "UicOperatingPeriod",
    "DayTypeAssignment",
    "TimetabledPassingTime",
    "DayTypeRef",
    "KeyValue",
    "NoticeAssignment",
]);

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    isArray: (name) => ARRAY_ELEMENT_NAMES.has(name),
});

// biome-ignore lint/suspicious/noExplicitAny: XML parser returns untyped data
const toArray = (value: any): any[] => {
    if (value === undefined || value === null) {
        return [];
    }

    return Array.isArray(value) ? value : [value];
};

const unwrap = (value: unknown): Record<string, unknown> | null => {
    if (Array.isArray(value)) {
        return value[0] as Record<string, unknown> ?? null;
    }

    return (value as Record<string, unknown>) ?? null;
};

const getAttr = (
    node: Record<string, unknown> | null | undefined,
    attr: string,
): string | null => {
    if (!node) {
        return null;
    }

    const value = node[`@_${attr}`];

    return typeof value === "string" ? value : null;
};

const getText = (node: unknown): string | null => {
    if (typeof node === "string") {
        return node;
    }

    if (typeof node === "number") {
        return String(node);
    }

    return null;
};

export const extractCisCode = (stopPlaceId: string): string | null => {
    const match = stopPlaceId.match(/CZ(\d{4,5})$/);

    return match ? match[1] : null;
};

export const expandValidDayBits = (
    fromDate: string,
    validDayBits: string,
): string[] => {
    const dates: string[] = [];
    const start = new Date(fromDate);

    for (let i = 0; i < validDayBits.length; i++) {
        if (validDayBits[i] !== "1") {
            continue;
        }

        const date = new Date(start);

        date.setDate(start.getDate() + i);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        dates.push(`${year}${month}${day}`);
    }

    return dates;
};

export const normalizeNeTExTime = (
    time: string | null,
    dayOffset: number,
): string | null => {
    if (!time) {
        return null;
    }

    if (dayOffset === 0) {
        return time;
    }

    const parts = time.split(":");

    if (parts.length < 2) {
        return time;
    }

    const hours = Number.parseInt(parts[0], 10) + dayOffset * 24;

    return `${String(hours).padStart(2, "0")}:${parts[1]}:${parts[2] ?? "00"}`;
};

export const parseNeTExXml = (xmlContent: string): ParsedNeTExFile => {
    const doc = parser.parse(xmlContent);
    const delivery = doc.PublicationDelivery;

    if (!delivery) {
        return emptyResult();
    }

    const compositeFrame = delivery.dataObjects?.CompositeFrame;

    if (!compositeFrame) {
        return emptyResult();
    }

    const frames = compositeFrame.frames;

    if (!frames) {
        return emptyResult();
    }

    const operators = parseOperators(frames.ResourceFrame);
    const { dayTypeIds, operatingPeriods, dayTypeAssignments } =
        parseServiceCalendar(frames.ServiceCalendarFrame);
    const stopPlaces = parseStopPlaces(frames.SiteFrame);
    const { lines, scheduledStopPoints, stopAssignments, journeyPatterns } =
        parseServiceFrame(frames.ServiceFrame);
    const serviceJourneys = parseServiceJourneys(frames.TimetableFrame);

    return {
        operators,
        stopPlaces,
        lines,
        scheduledStopPoints,
        stopAssignments,
        journeyPatterns,
        serviceJourneys,
        dayTypeIds,
        operatingPeriods,
        dayTypeAssignments,
    };
};

const emptyResult = (): ParsedNeTExFile => ({
    operators: [],
    stopPlaces: [],
    lines: [],
    scheduledStopPoints: [],
    stopAssignments: [],
    journeyPatterns: [],
    serviceJourneys: [],
    dayTypeIds: [],
    operatingPeriods: [],
    dayTypeAssignments: [],
});

// biome-ignore lint/suspicious/noExplicitAny: XML parser output
const parseOperators = (resourceFrame: any): NeTExOperator[] => {
    if (!resourceFrame) {
        return [];
    }

    const operators = toArray(resourceFrame.organisations?.Operator);

    return operators.map((op: Record<string, unknown>) => ({
        id: getAttr(op, "id") ?? "",
        publicCode: getText(op.PublicCode) ?? "",
        legalName: getText(op.LegalName) ?? "",
    }));
};

const parseServiceCalendar = (
    // biome-ignore lint/suspicious/noExplicitAny: XML parser output
    calendarFrame: any,
): {
    dayTypeIds: string[];
    operatingPeriods: NeTExUicOperatingPeriod[];
    dayTypeAssignments: NeTExDayTypeAssignment[];
} => {
    if (!calendarFrame) {
        return { dayTypeIds: [], operatingPeriods: [], dayTypeAssignments: [] };
    }

    const calendar = calendarFrame.ServiceCalendar;

    if (!calendar) {
        return { dayTypeIds: [], operatingPeriods: [], dayTypeAssignments: [] };
    }

    const dayTypeIds = toArray(calendar.dayTypes?.DayType).map(
        (dt: Record<string, unknown>) => getAttr(dt, "id") ?? "",
    );

    const operatingPeriods = toArray(
        calendar.operatingPeriods?.UicOperatingPeriod,
    ).map(
        (op: Record<string, unknown>): NeTExUicOperatingPeriod => ({
            id: getAttr(op, "id") ?? "",
            fromDate: getText(op.FromDate) ?? "",
            toDate: getText(op.ToDate) ?? "",
            validDayBits: getText(op.ValidDayBits) ?? "",
        }),
    );

    const dayTypeAssignments = toArray(
        calendar.dayTypeAssignments?.DayTypeAssignment,
    ).map(
        (dta: Record<string, unknown>): NeTExDayTypeAssignment => ({
            dayTypeRef: getAttr(unwrap(dta.DayTypeRef), "ref") ?? "",
            operatingPeriodRef:
                getAttr(unwrap(dta.OperatingPeriodRef), "ref") ?? "",
        }),
    );

    return { dayTypeIds, operatingPeriods, dayTypeAssignments };
};

// biome-ignore lint/suspicious/noExplicitAny: XML parser output
const parseStopPlaces = (siteFrame: any): NeTExStopPlace[] => {
    if (!siteFrame) {
        return [];
    }

    return toArray(siteFrame.stopPlaces?.StopPlace).map(
        (sp: Record<string, unknown>): NeTExStopPlace => {
            const id = getAttr(sp, "id") ?? "";

            return {
                id,
                name: getText(sp.Name) ?? "",
                cisCode: extractCisCode(id),
            };
        },
    );
};

const parseServiceFrame = (
    // biome-ignore lint/suspicious/noExplicitAny: XML parser output
    serviceFrame: any,
): {
    lines: NeTExLine[];
    scheduledStopPoints: NeTExScheduledStopPoint[];
    stopAssignments: NeTExStopAssignment[];
    journeyPatterns: NeTExJourneyPattern[];
} => {
    if (!serviceFrame) {
        return {
            lines: [],
            scheduledStopPoints: [],
            stopAssignments: [],
            journeyPatterns: [],
        };
    }

    const lines = toArray(serviceFrame.lines?.Line).map(
        (line: Record<string, unknown>): NeTExLine => ({
            id: getAttr(line, "id") ?? "",
            name: getText(line.Name) ?? "",
            shortName: getText(line.ShortName),
            publicCode: getText(line.PublicCode),
            transportMode: getText(line.TransportMode) ?? "rail",
            operatorRef:
                getAttr(
                    line.OperatorRef as Record<string, unknown>,
                    "ref",
                ) ?? "",
        }),
    );

    const scheduledStopPoints = toArray(
        serviceFrame.scheduledStopPoints?.ScheduledStopPoint,
    ).map(
        (ssp: Record<string, unknown>): NeTExScheduledStopPoint => ({
            id: getAttr(ssp, "id") ?? "",
            name: getText(ssp.Name) ?? "",
        }),
    );

    const stopAssignments = toArray(
        serviceFrame.stopAssignments?.PassengerStopAssignment,
    ).map(
        (sa: Record<string, unknown>): NeTExStopAssignment => ({
            scheduledStopPointRef:
                getAttr(
                    sa.ScheduledStopPointRef as Record<string, unknown>,
                    "ref",
                ) ?? "",
            stopPlaceRef:
                getAttr(
                    sa.StopPlaceRef as Record<string, unknown>,
                    "ref",
                ) ?? "",
        }),
    );

    const journeyPatterns = toArray(
        serviceFrame.journeyPatterns?.ServiceJourneyPattern,
    ).map((jp: Record<string, unknown>): NeTExJourneyPattern => {
        const routeView = jp.RouteView as Record<string, unknown> | undefined;
        const lineRef = routeView
            ? getAttr(routeView.LineRef as Record<string, unknown>, "ref") ?? ""
            : "";

        const stops = toArray(
            (jp.pointsInSequence as Record<string, unknown>)
                ?.StopPointInJourneyPattern,
        ).map(
            (sp: Record<string, unknown>): NeTExStopPointInPattern => ({
                id: getAttr(sp, "id") ?? "",
                order: Number(getAttr(sp, "order") ?? "0"),
                scheduledStopPointRef:
                    getAttr(
                        sp.ScheduledStopPointRef as Record<string, unknown>,
                        "ref",
                    ) ?? "",
            }),
        );

        return { id: getAttr(jp, "id") ?? "", lineRef, stops };
    });

    return { lines, scheduledStopPoints, stopAssignments, journeyPatterns };
};

// biome-ignore lint/suspicious/noExplicitAny: XML parser output
const parseServiceJourneys = (timetableFrame: any): NeTExServiceJourney[] => {
    if (!timetableFrame) {
        return [];
    }

    return toArray(timetableFrame.vehicleJourneys?.ServiceJourney).map(
        (sj: Record<string, unknown>): NeTExServiceJourney => {
            const dayTypeRefs = toArray(
                (sj.dayTypes as Record<string, unknown>)?.DayTypeRef,
            ).map(
                (ref: Record<string, unknown>) => getAttr(ref, "ref") ?? "",
            );

            const journeyPatternRef =
                getAttr(
                    sj.ServiceJourneyPatternRef as Record<string, unknown>,
                    "ref",
                ) ?? "";

            const operatorRef = sj.OperatorRef
                ? getAttr(
                      sj.OperatorRef as Record<string, unknown>,
                      "ref",
                  )
                : null;

            const transportMode = getText(sj.TransportMode);

            const passingTimes = toArray(
                (sj.passingTimes as Record<string, unknown>)
                    ?.TimetabledPassingTime,
            ).map(
                (pt: Record<string, unknown>): NeTExPassingTime => ({
                    stopPointRef:
                        getAttr(
                            pt.StopPointInJourneyPatternRef as Record<
                                string,
                                unknown
                            >,
                            "ref",
                        ) ?? "",
                    arrivalTime: getText(pt.ArrivalTime),
                    departureTime: getText(pt.DepartureTime),
                    arrivalDayOffset: Number(getText(pt.ArrivalDayOffset) ?? 0),
                    departureDayOffset: Number(
                        getText(pt.DepartureDayOffset) ?? 0,
                    ),
                }),
            );

            // Extract PlannedTransportIdentifiers and RelatedPlannedTransportIdentifiers from keyList
            let plannedTransportId: string | null = null;
            const relatedPlannedTransportIds: string[] = [];
            const keyValues = toArray(
                (sj.keyList as Record<string, unknown>)?.KeyValue,
            );

            for (const kv of keyValues) {
                const key = getText(
                    (kv as Record<string, unknown>).Key,
                );
                const value = getText(
                    (kv as Record<string, unknown>).Value,
                );

                if (!key || !value) {
                    continue;
                }

                if (
                    key === "PlannedTransportIdentifiers" &&
                    value.startsWith("PA/")
                ) {
                    plannedTransportId = value;
                } else if (
                    key === "RelatedPlannedTransportIdentifiers" &&
                    value.startsWith("PA/")
                ) {
                    relatedPlannedTransportIds.push(value);
                }
            }

            return {
                id: getAttr(sj, "id") ?? "",
                dayTypeRefs,
                journeyPatternRef,
                operatorRef,
                transportMode,
                passingTimes,
                plannedTransportId,
                relatedPlannedTransportIds,
            };
        },
    );
};
