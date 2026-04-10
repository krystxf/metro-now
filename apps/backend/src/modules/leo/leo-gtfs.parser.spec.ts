import { buildLeoCatalogFromCsv } from "src/modules/leo/leo-gtfs.parser";

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
            entrances: [
                expect.objectContaining({ id: "station-a-e1" }),
            ],
        });
        expect(catalog.stops[1]).toMatchObject({
            id: "TLS:station-b",
            platforms: [
                expect.objectContaining({ id: "TLP:station-b" }),
            ],
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
});
