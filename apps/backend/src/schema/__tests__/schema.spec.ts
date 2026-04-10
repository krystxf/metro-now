import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
    buildSchema,
    type GraphQLEnumType,
    type GraphQLField,
    type GraphQLNamedType,
    type GraphQLNonNull,
    type GraphQLObjectType,
    type GraphQLSchema,
    isEnumType,
    isListType,
    isNonNullType,
    isObjectType,
    isScalarType,
} from "graphql";

const SCHEMA_FILES = [
    "src/common/scalars/scalars.graphql",
    "src/modules/stop/schema.graphql",
    "src/modules/platform/schema.graphql",
    "src/modules/route/schema.graphql",
    "src/modules/departure/schema.graphql",
    "src/modules/hello/schema.graphql",
    "src/modules/infotexts/schema.graphql",
];

const ROOT = join(__dirname, "..", "..", "..");

const loadSchema = (): GraphQLSchema => {
    let seenQuery = false;

    const sdl = SCHEMA_FILES.map((f) => {
        let content = readFileSync(join(ROOT, f), "utf-8");

        // NestJS merges multiple `type Query` blocks automatically.
        // buildSchema requires `extend type Query` for all but the first.
        if (content.includes("type Query")) {
            if (seenQuery) {
                content = content.replace("type Query", "extend type Query");
            } else {
                seenQuery = true;
            }
        }

        return content;
    }).join("\n");

    return buildSchema(sdl);
};

const getObjectType = (
    schema: GraphQLSchema,
    name: string,
): GraphQLObjectType => {
    const type = schema.getType(name);

    if (!isObjectType(type)) {
        throw new Error(`Expected ${name} to be an object type`);
    }

    return type;
};

const getEnumType = (
    schema: GraphQLSchema,
    name: string,
): GraphQLEnumType => {
    const type = schema.getType(name);

    if (!isEnumType(type)) {
        throw new Error(`Expected ${name} to be an enum type`);
    }

    return type;
};

describe("GraphQL schema", () => {
    let schema: GraphQLSchema;

    beforeAll(() => {
        schema = loadSchema();
    });

    it("parses all .graphql files into a valid schema", () => {
        expect(schema).toBeDefined();
        expect(schema.getQueryType()).toBeDefined();
    });

    describe("Query type", () => {
        const EXPECTED_QUERIES = [
            "hello",
            "stops",
            "stop",
            "platforms",
            "platform",
            "routes",
            "route",
            "departures",
            "infotexts",
        ];

        it("has all expected query fields", () => {
            const queryType = schema.getQueryType()!;
            const fieldNames = Object.keys(queryType.getFields());

            for (const name of EXPECTED_QUERIES) {
                expect(fieldNames).toContain(name);
            }
        });

        it("has no unexpected query fields", () => {
            const queryType = schema.getQueryType()!;
            const fieldNames = Object.keys(queryType.getFields());

            for (const name of fieldNames) {
                expect(EXPECTED_QUERIES).toContain(name);
            }
        });

        it("hello returns non-null String", () => {
            const field = schema.getQueryType()!.getFields()["hello"];

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                isScalarType((field.type as GraphQLNonNull<any>).ofType),
            ).toBe(true);
        });

        it("stop returns nullable Stop", () => {
            const field = schema.getQueryType()!.getFields()["stop"];

            expect(isNonNullType(field.type)).toBe(false);
            expect(isObjectType(field.type)).toBe(true);
            expect((field.type as GraphQLObjectType).name).toBe("Stop");
        });

        it("stops returns non-null list of non-null Stop", () => {
            const field = schema.getQueryType()!.getFields()["stops"];

            expect(isNonNullType(field.type)).toBe(true);

            const listType = (field.type as GraphQLNonNull<any>).ofType;

            expect(isListType(listType)).toBe(true);
        });

        it("route returns nullable Route", () => {
            const field = schema.getQueryType()!.getFields()["route"];

            expect(isNonNullType(field.type)).toBe(false);
            expect(isObjectType(field.type)).toBe(true);
            expect((field.type as GraphQLObjectType).name).toBe("Route");
        });

        it("platform returns nullable Platform", () => {
            const field = schema.getQueryType()!.getFields()["platform"];

            expect(isNonNullType(field.type)).toBe(false);
            expect(isObjectType(field.type)).toBe(true);
            expect((field.type as GraphQLObjectType).name).toBe("Platform");
        });

        it("departures requires stopIds or platformIds arguments", () => {
            const field = schema.getQueryType()!.getFields()["departures"];
            const argNames = field.args.map((a) => a.name);

            expect(argNames).toContain("stopIds");
            expect(argNames).toContain("platformIds");
            expect(argNames).toContain("limit");
        });

        it("stop query takes required id argument", () => {
            const field = schema.getQueryType()!.getFields()["stop"];
            const idArg = field.args.find((a) => a.name === "id");

            expect(idArg).toBeDefined();
            expect(isNonNullType(idArg!.type)).toBe(true);
        });

        it("stops query accepts optional ids, limit, offset", () => {
            const field = schema.getQueryType()!.getFields()["stops"];
            const argNames = field.args.map((a) => a.name);

            expect(argNames).toContain("ids");
            expect(argNames).toContain("limit");
            expect(argNames).toContain("offset");

            // all optional
            for (const arg of field.args) {
                expect(isNonNullType(arg.type)).toBe(false);
            }
        });
    });

    describe("Stop type", () => {
        it("has all required fields", () => {
            const stop = getObjectType(schema, "Stop");
            const fields = stop.getFields();

            expect(fields["id"]).toBeDefined();
            expect(fields["name"]).toBeDefined();
            expect(fields["avgLatitude"]).toBeDefined();
            expect(fields["avgLongitude"]).toBeDefined();
            expect(fields["entrances"]).toBeDefined();
            expect(fields["platforms"]).toBeDefined();
        });

        it("id and name are non-null", () => {
            const stop = getObjectType(schema, "Stop");

            expect(isNonNullType(stop.getFields()["id"].type)).toBe(true);
            expect(isNonNullType(stop.getFields()["name"].type)).toBe(true);
        });

        it("platforms returns a list of Platform", () => {
            const stop = getObjectType(schema, "Stop");
            const field = stop.getFields()["platforms"];

            expect(isNonNullType(field.type)).toBe(true);

            const listType = (field.type as GraphQLNonNull<any>).ofType;

            expect(isListType(listType)).toBe(true);
        });
    });

    describe("Platform type", () => {
        it("has all required fields", () => {
            const platform = getObjectType(schema, "Platform");
            const fieldNames = Object.keys(platform.getFields());

            expect(fieldNames).toEqual(
                expect.arrayContaining([
                    "id",
                    "name",
                    "latitude",
                    "longitude",
                    "isMetro",
                    "code",
                    "stop",
                    "routes",
                ]),
            );
        });

        it("code is nullable", () => {
            const platform = getObjectType(schema, "Platform");

            expect(isNonNullType(platform.getFields()["code"].type)).toBe(
                false,
            );
        });

        it("stop is nullable", () => {
            const platform = getObjectType(schema, "Platform");

            expect(isNonNullType(platform.getFields()["stop"].type)).toBe(
                false,
            );
        });

        it("isMetro is non-null Boolean", () => {
            const platform = getObjectType(schema, "Platform");
            const field = platform.getFields()["isMetro"];

            expect(isNonNullType(field.type)).toBe(true);
        });
    });

    describe("Route type", () => {
        it("has all required fields", () => {
            const route = getObjectType(schema, "Route");
            const fieldNames = Object.keys(route.getFields());

            expect(fieldNames).toEqual(
                expect.arrayContaining([
                    "id",
                    "name",
                    "directions",
                    "shapes",
                    "isSubstitute",
                    "vehicleType",
                    "isNight",
                ]),
            );
        });

        it("name is nullable", () => {
            const route = getObjectType(schema, "Route");

            expect(isNonNullType(route.getFields()["name"].type)).toBe(false);
        });

        it("vehicleType is non-null VehicleType enum", () => {
            const route = getObjectType(schema, "Route");
            const field = route.getFields()["vehicleType"];

            expect(isNonNullType(field.type)).toBe(true);

            const innerType = (field.type as GraphQLNonNull<any>).ofType;

            expect(isEnumType(innerType)).toBe(true);
            expect(innerType.name).toBe("VehicleType");
        });
    });

    describe("Departure type", () => {
        it("has all required fields", () => {
            const departure = getObjectType(schema, "Departure");
            const fieldNames = Object.keys(departure.getFields());

            expect(fieldNames).toEqual(
                expect.arrayContaining([
                    "delay",
                    "headsign",
                    "isRealtime",
                    "platform",
                    "departureTime",
                    "route",
                ]),
            );
        });

        it("delay is nullable", () => {
            const departure = getObjectType(schema, "Departure");

            expect(isNonNullType(departure.getFields()["delay"].type)).toBe(
                false,
            );
        });

        it("route is nullable", () => {
            const departure = getObjectType(schema, "Departure");

            expect(isNonNullType(departure.getFields()["route"].type)).toBe(
                false,
            );
        });

        it("platform is non-null", () => {
            const departure = getObjectType(schema, "Departure");

            expect(
                isNonNullType(departure.getFields()["platform"].type),
            ).toBe(true);
        });
    });

    describe("DepartureTime type", () => {
        it("has predicted and scheduled as non-null", () => {
            const dt = getObjectType(schema, "DepartureTime");

            expect(
                isNonNullType(dt.getFields()["predicted"].type),
            ).toBe(true);
            expect(
                isNonNullType(dt.getFields()["scheduled"].type),
            ).toBe(true);
        });
    });

    describe("Infotext type", () => {
        it("has all required fields", () => {
            const infotext = getObjectType(schema, "Infotext");
            const fieldNames = Object.keys(infotext.getFields());

            expect(fieldNames).toEqual(
                expect.arrayContaining([
                    "id",
                    "text",
                    "textEn",
                    "priority",
                    "displayType",
                    "relatedStops",
                    "validFrom",
                    "validTo",
                ]),
            );
        });

        it("textEn is nullable", () => {
            const infotext = getObjectType(schema, "Infotext");

            expect(isNonNullType(infotext.getFields()["textEn"].type)).toBe(
                false,
            );
        });

        it("validFrom and validTo are nullable", () => {
            const infotext = getObjectType(schema, "Infotext");

            expect(
                isNonNullType(infotext.getFields()["validFrom"].type),
            ).toBe(false);
            expect(
                isNonNullType(infotext.getFields()["validTo"].type),
            ).toBe(false);
        });

        it("priority is non-null InfotextPriority enum", () => {
            const infotext = getObjectType(schema, "Infotext");
            const field = infotext.getFields()["priority"];

            expect(isNonNullType(field.type)).toBe(true);

            const innerType = (field.type as GraphQLNonNull<any>).ofType;

            expect(isEnumType(innerType)).toBe(true);
            expect(innerType.name).toBe("InfotextPriority");
        });
    });

    describe("RouteDirection type", () => {
        it("has id and platforms fields", () => {
            const rd = getObjectType(schema, "RouteDirection");
            const fieldNames = Object.keys(rd.getFields());

            expect(fieldNames).toContain("id");
            expect(fieldNames).toContain("platforms");
        });
    });

    describe("RouteShape type", () => {
        it("has id, directionId, tripCount, geoJson", () => {
            const rs = getObjectType(schema, "RouteShape");
            const fieldNames = Object.keys(rs.getFields());

            expect(fieldNames).toEqual(
                expect.arrayContaining([
                    "id",
                    "directionId",
                    "tripCount",
                    "geoJson",
                ]),
            );
        });
    });

    describe("StopEntrance type", () => {
        it("has id, name, latitude, longitude", () => {
            const se = getObjectType(schema, "StopEntrance");
            const fieldNames = Object.keys(se.getFields());

            expect(fieldNames).toEqual(
                expect.arrayContaining([
                    "id",
                    "name",
                    "latitude",
                    "longitude",
                ]),
            );
        });

        it("all fields are non-null", () => {
            const se = getObjectType(schema, "StopEntrance");

            for (const field of Object.values(se.getFields())) {
                expect(isNonNullType(field.type)).toBe(true);
            }
        });
    });

    describe("InfotextRelatedStop type", () => {
        it("has id, name, and nullable platformCode", () => {
            const irs = getObjectType(schema, "InfotextRelatedStop");
            const fields = irs.getFields();

            expect(isNonNullType(fields["id"].type)).toBe(true);
            expect(isNonNullType(fields["name"].type)).toBe(true);
            expect(isNonNullType(fields["platformCode"].type)).toBe(false);
        });
    });

    describe("enums", () => {
        it("VehicleType has all expected values", () => {
            const vehicleType = getEnumType(schema, "VehicleType");
            const values = vehicleType.getValues().map((v) => v.name);

            expect(values).toEqual(
                expect.arrayContaining([
                    "BUS",
                    "TRAM",
                    "FERRY",
                    "TRAIN",
                    "FUNICULAR",
                    "SUBWAY",
                    "TROLLEYBUS",
                ]),
            );
            expect(values).toHaveLength(7);
        });

        it("InfotextPriority has LOW, NORMAL, HIGH", () => {
            const priority = getEnumType(schema, "InfotextPriority");
            const values = priority.getValues().map((v) => v.name);

            expect(values).toEqual(
                expect.arrayContaining(["LOW", "NORMAL", "HIGH"]),
            );
            expect(values).toHaveLength(3);
        });
    });

    describe("custom scalars", () => {
        it("defines ISODateTime scalar", () => {
            const type = schema.getType("ISODateTime");

            expect(type).toBeDefined();
            expect(isScalarType(type)).toBe(true);
        });
    });

    describe("cross-type references", () => {
        it("Stop.platforms references Platform type", () => {
            const stop = getObjectType(schema, "Stop");
            const field = stop.getFields()["platforms"];

            // [Platform!]! → NonNull(List(NonNull(Platform)))
            expect(isNonNullType(field.type)).toBe(true);

            const listType = (field.type as GraphQLNonNull<any>).ofType;

            expect(isListType(listType)).toBe(true);

            const innerType = listType.ofType;

            expect(isNonNullType(innerType)).toBe(true);
            expect((innerType as GraphQLNonNull<any>).ofType.name).toBe(
                "Platform",
            );
        });

        it("Platform.stop references Stop type", () => {
            const platform = getObjectType(schema, "Platform");
            const field = platform.getFields()["stop"];

            expect(isObjectType(field.type)).toBe(true);
            expect((field.type as GraphQLObjectType).name).toBe("Stop");
        });

        it("Platform.routes references Route type", () => {
            const platform = getObjectType(schema, "Platform");
            const field = platform.getFields()["routes"];

            expect(isNonNullType(field.type)).toBe(true);

            const listType = (field.type as GraphQLNonNull<any>).ofType;

            expect(isListType(listType)).toBe(true);
        });

        it("Departure.platform references Platform type", () => {
            const departure = getObjectType(schema, "Departure");
            const field = departure.getFields()["platform"];

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                (
                    (field.type as GraphQLNonNull<any>)
                        .ofType as GraphQLObjectType
                ).name,
            ).toBe("Platform");
        });

        it("Departure.route references Route type", () => {
            const departure = getObjectType(schema, "Departure");
            const field = departure.getFields()["route"];

            expect(isObjectType(field.type)).toBe(true);
            expect((field.type as GraphQLObjectType).name).toBe("Route");
        });

        it("Route.directions references RouteDirection type", () => {
            const route = getObjectType(schema, "Route");
            const field = route.getFields()["directions"];

            expect(isNonNullType(field.type)).toBe(true);

            const listType = (field.type as GraphQLNonNull<any>).ofType;

            expect(isListType(listType)).toBe(true);
        });

        it("Route.shapes references RouteShape type", () => {
            const route = getObjectType(schema, "Route");
            const field = route.getFields()["shapes"];

            expect(isNonNullType(field.type)).toBe(true);

            const listType = (field.type as GraphQLNonNull<any>).ofType;

            expect(isListType(listType)).toBe(true);
        });

        it("Stop.entrances references StopEntrance type", () => {
            const stop = getObjectType(schema, "Stop");
            const field = stop.getFields()["entrances"];

            expect(isNonNullType(field.type)).toBe(true);

            const listType = (field.type as GraphQLNonNull<any>).ofType;

            expect(isListType(listType)).toBe(true);
        });
    });

    describe("generated types alignment", () => {
        it("every schema type exists in the schema", () => {
            const expectedTypes = [
                "Stop",
                "StopEntrance",
                "Platform",
                "Route",
                "RouteDirection",
                "RouteShape",
                "Departure",
                "DepartureTime",
                "Infotext",
                "InfotextRelatedStop",
                "VehicleType",
                "InfotextPriority",
            ];

            for (const typeName of expectedTypes) {
                expect(schema.getType(typeName)).toBeDefined();
            }
        });

        it("no orphan types (every non-Query object type is referenced)", () => {
            const typeMap = schema.getTypeMap();
            const referencedTypes = new Set<string>();

            // collect all types referenced from Query fields and other object type fields
            const collectReferences = (type: GraphQLNamedType) => {
                if (!isObjectType(type)) return;

                for (const field of Object.values(type.getFields())) {
                    let unwrapped = field.type;

                    while ("ofType" in unwrapped && unwrapped.ofType) {
                        unwrapped = unwrapped.ofType;
                    }

                    if ("name" in unwrapped) {
                        referencedTypes.add(unwrapped.name);
                    }
                }
            };

            for (const type of Object.values(typeMap)) {
                collectReferences(type);
            }

            const customObjectTypes = Object.values(typeMap)
                .filter(isObjectType)
                .filter((t) => !t.name.startsWith("__"))
                .filter((t) => t.name !== "Query");

            for (const type of customObjectTypes) {
                expect(referencedTypes).toContain(type.name);
            }
        });
    });
});
