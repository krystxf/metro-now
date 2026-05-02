import { buildLeoCatalogFromCsv } from "src/modules/leo/leo-gtfs.parser";

const LEO_AGENCY_CSV = "agency_id,agency_name\n2,Leo Express s.r.o.";
const STOP_HEADERS =
    "stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station,platform_code";
const ROUTE_HEADERS =
    "route_id,agency_id,route_short_name,route_long_name,route_type,route_url,route_color";
const TRIP_HEADERS =
    "trip_id,route_id,trip_headsign,trip_short_name,direction_id";
const STOP_TIME_HEADERS = "trip_id,stop_id,stop_sequence";

describe("buildLeoCatalogFromCsv", () => {
    it("filters Leo agencies, expands parent stations, synthesizes standalone platforms, and picks the dominant pattern", async () => {
        const catalog = await buildLeoCatalogFromCsv({
            agenciesCsv: [
                "agency_id,agency_name",
                '0,"Other Operator"',
                '2,"Leo Express s.r.o."',
                '4,"Leo Express Slovensko s.r.o."',
            ].join("\n"),
            routesCsv: [
                "route_id,agency_id,route_short_name,route_long_name,route_type,route_url,route_color",
                'r-ignore,0,"X 1","Ignore",3,,',
                'r-leo,2,"LE 100","Leo Route",100,,000000',
                'r-slovak,4,"REX 200","Leo SK",106,,111111',
            ].join("\n"),
            tripsCsv: [
                "trip_id,route_id,trip_headsign,trip_short_name,direction_id",
                't-dominant-1,r-leo,"Station B","100",0',
                't-dominant-2,r-leo,"Station B","100",0',
                't-secondary,r-leo,"Station B","100",0',
                't-slovak,r-slovak,"Station B","200",1',
            ].join("\n"),
            stopsCsv: [
                "stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station,platform_code",
                'station-a,"Station A",50.0000,14.0000,1,,',
                'station-a-p1,"Station A platform 1",50.0001,14.0001,0,station-a,1',
                'station-a-p2,"Station A platform 2",50.0002,14.0002,0,station-a,2',
                'station-a-e1,"Station A entrance",50.0003,14.0003,2,station-a,',
                'station-b,"Station B",50.1000,14.1000,0,,',
                'station-c,"Station C",50.2000,14.2000,0,,',
            ].join("\n"),
            stopTimesCsv: [
                "trip_id,stop_id,stop_sequence",
                "t-dominant-1,station-a-p1,1",
                "t-dominant-1,station-b,2",
                "t-dominant-2,station-a-p1,1",
                "t-dominant-2,station-b,2",
                "t-secondary,station-a-p2,1",
                "t-secondary,station-c,2",
                "t-slovak,station-b,1",
                "t-slovak,station-a-p2,2",
            ].join("\n"),
        });

        expect(catalog.routes.map((route) => route.id)).toEqual([
            "LTL:r-leo",
            "LTL:r-slovak",
        ]);
        expect(catalog.stops.map((stop) => stop.id)).toEqual([
            "TLS:station-a",
            "TLS:station-b",
            "TLS:station-c",
        ]);
        expect(catalog.stops[0]).toMatchObject({
            id: "TLS:station-a",
            platforms: [
                expect.objectContaining({ id: "TLP:station-a-p1" }),
                expect.objectContaining({ id: "TLP:station-a-p2" }),
            ],
            entrances: [expect.objectContaining({ id: "station-a-e1" })],
        });
        expect(catalog.stops[1]).toMatchObject({
            id: "TLS:station-b",
            platforms: [expect.objectContaining({ id: "TLP:station-b" })],
        });
        expect(catalog.routes[0]).toMatchObject({
            id: "LTL:r-leo",
            directions: [
                {
                    id: "0",
                    platforms: [
                        expect.objectContaining({ id: "TLP:station-a-p1" }),
                        expect.objectContaining({ id: "TLP:station-b" }),
                    ],
                },
            ],
            shapes: [
                expect.objectContaining({
                    id: "generated:r-leo:0",
                    tripCount: 2,
                }),
            ],
        });
    });

    it("excludes stops not referenced by any Leo trip stop time", async () => {
        const catalog = await buildLeoCatalogFromCsv({
            agenciesCsv: LEO_AGENCY_CSV,
            routesCsv: [ROUTE_HEADERS, "r1,2,LE1,Leo Route,100,,"].join("\n"),
            tripsCsv: [TRIP_HEADERS, "t1,r1,,,0"].join("\n"),
            stopsCsv: [
                STOP_HEADERS,
                "stop-a,Stop A,50.0,14.0,0,,",
                "stop-b,Stop B,50.1,14.1,0,,",
            ].join("\n"),
            stopTimesCsv: [STOP_TIME_HEADERS, "t1,stop-a,1"].join("\n"),
        });

        expect(catalog.stops.map((s) => s.id)).toEqual(["TLS:stop-a"]);
    });

    it("deduplicates consecutive identical coordinates in route shapes", async () => {
        const catalog = await buildLeoCatalogFromCsv({
            agenciesCsv: LEO_AGENCY_CSV,
            routesCsv: [ROUTE_HEADERS, "r1,2,LE1,Leo Route,100,,"].join("\n"),
            tripsCsv: [TRIP_HEADERS, "t1,r1,,,0"].join("\n"),
            stopsCsv: [
                STOP_HEADERS,
                "stop-a,Stop A,50.0,14.0,0,,",
                "stop-b,Stop B,50.0,14.0,0,,",
            ].join("\n"),
            stopTimesCsv: [
                STOP_TIME_HEADERS,
                "t1,stop-a,1",
                "t1,stop-b,2",
            ].join("\n"),
        });

        expect(catalog.routes[0]?.shapes[0]?.points).toHaveLength(1);
    });

    it("skips trips where all stop times reference station stops (not platforms)", async () => {
        const catalog = await buildLeoCatalogFromCsv({
            agenciesCsv: LEO_AGENCY_CSV,
            routesCsv: [ROUTE_HEADERS, "r1,2,LE1,Leo Route,100,,"].join("\n"),
            tripsCsv: [TRIP_HEADERS, "t1,r1,,,0"].join("\n"),
            stopsCsv: [STOP_HEADERS, "stop-a,Stop A,50.0,14.0,1,,"].join("\n"),
            stopTimesCsv: [STOP_TIME_HEADERS, "t1,stop-a,1"].join("\n"),
        });

        expect(catalog.routes[0]?.directions).toEqual([]);
        expect(catalog.routes[0]?.shapes).toEqual([]);
    });

    it("ignores stop times from non-Leo trips when counting pattern trips", async () => {
        const catalog = await buildLeoCatalogFromCsv({
            agenciesCsv: [
                "agency_id,agency_name",
                "2,Leo Express s.r.o.",
                "9,Other Operator",
            ].join("\n"),
            routesCsv: [
                ROUTE_HEADERS,
                "r-leo,2,LE1,Leo Route,100,,",
                "r-other,9,X9,Other Route,3,,",
            ].join("\n"),
            tripsCsv: [
                TRIP_HEADERS,
                "t-leo,r-leo,,,0",
                "t-other,r-other,,,0",
            ].join("\n"),
            stopsCsv: [
                STOP_HEADERS,
                "stop-a,Stop A,50.0,14.0,0,,",
                "stop-b,Stop B,50.1,14.1,0,,",
            ].join("\n"),
            stopTimesCsv: [
                STOP_TIME_HEADERS,
                "t-leo,stop-a,1",
                "t-leo,stop-b,2",
                "t-other,stop-a,1",
                "t-other,stop-b,2",
            ].join("\n"),
        });

        expect(catalog.routes).toHaveLength(1);
        expect(catalog.routes[0]?.shapes[0]?.tripCount).toBe(1);
    });

    it("assigns all visiting Leo route IDs to a shared platform", async () => {
        const catalog = await buildLeoCatalogFromCsv({
            agenciesCsv: LEO_AGENCY_CSV,
            routesCsv: [
                ROUTE_HEADERS,
                "r-alpha,2,LE1,Leo Alpha,100,,",
                "r-beta,2,LE2,Leo Beta,100,,",
            ].join("\n"),
            tripsCsv: [
                TRIP_HEADERS,
                "t-alpha,r-alpha,,,0",
                "t-beta,r-beta,,,0",
            ].join("\n"),
            stopsCsv: [
                STOP_HEADERS,
                "stop-shared,Shared Stop,50.0,14.0,0,,",
            ].join("\n"),
            stopTimesCsv: [
                STOP_TIME_HEADERS,
                "t-alpha,stop-shared,1",
                "t-beta,stop-shared,1",
            ].join("\n"),
        });

        const platform = catalog.stops[0]?.platforms[0];

        expect(platform?.routes.map((r) => r.id)).toEqual([
            "LTL:r-alpha",
            "LTL:r-beta",
        ]);
    });

    it("includes trips from Leo Express Slovensko s.r.o. agency", async () => {
        const catalog = await buildLeoCatalogFromCsv({
            agenciesCsv:
                "agency_id,agency_name\n4,Leo Express Slovensko s.r.o.",
            routesCsv: [ROUTE_HEADERS, "r-sk,4,REX1,Leo SK Route,106,,"].join(
                "\n",
            ),
            tripsCsv: [TRIP_HEADERS, "t-sk,r-sk,,,0"].join("\n"),
            stopsCsv: [STOP_HEADERS, "stop-sk,Slovak Stop,48.0,17.0,0,,"].join(
                "\n",
            ),
            stopTimesCsv: [STOP_TIME_HEADERS, "t-sk,stop-sk,1"].join("\n"),
        });

        expect(catalog.routes.map((r) => r.id)).toEqual(["LTL:r-sk"]);
        expect(catalog.stops.map((s) => s.id)).toEqual(["TLS:stop-sk"]);
    });

    it("includes a Leo route with no matching trips as empty directions and shapes", async () => {
        const catalog = await buildLeoCatalogFromCsv({
            agenciesCsv: LEO_AGENCY_CSV,
            routesCsv: [
                ROUTE_HEADERS,
                "r-active,2,LE1,Active Route,100,,",
                "r-empty,2,LE2,Empty Route,100,,",
            ].join("\n"),
            tripsCsv: [TRIP_HEADERS, "t1,r-active,,,0"].join("\n"),
            stopsCsv: [STOP_HEADERS, "stop-a,Stop A,50.0,14.0,0,,"].join("\n"),
            stopTimesCsv: [STOP_TIME_HEADERS, "t1,stop-a,1"].join("\n"),
        });

        const emptyRoute = catalog.routes.find((r) => r.id === "LTL:r-empty");

        expect(emptyRoute?.directions).toEqual([]);
        expect(emptyRoute?.shapes).toEqual([]);
    });

    it("sorts platform routes alphabetically by ID", async () => {
        const catalog = await buildLeoCatalogFromCsv({
            agenciesCsv: LEO_AGENCY_CSV,
            routesCsv: [
                ROUTE_HEADERS,
                "r-zzz,2,LE3,Last Route,100,,",
                "r-aaa,2,LE1,First Route,100,,",
                "r-mmm,2,LE2,Middle Route,100,,",
            ].join("\n"),
            tripsCsv: [
                TRIP_HEADERS,
                "t-zzz,r-zzz,,,0",
                "t-aaa,r-aaa,,,0",
                "t-mmm,r-mmm,,,0",
            ].join("\n"),
            stopsCsv: [STOP_HEADERS, "stop-shared,Shared,50.0,14.0,0,,"].join(
                "\n",
            ),
            stopTimesCsv: [
                STOP_TIME_HEADERS,
                "t-zzz,stop-shared,1",
                "t-aaa,stop-shared,1",
                "t-mmm,stop-shared,1",
            ].join("\n"),
        });

        const platform = catalog.stops[0]?.platforms[0];

        expect(platform?.routes.map((r) => r.id)).toEqual([
            "LTL:r-aaa",
            "LTL:r-mmm",
            "LTL:r-zzz",
        ]);
    });
});
