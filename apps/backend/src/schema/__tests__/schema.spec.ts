import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
    type GraphQLEnumType,
    type GraphQLNamedType,
    type GraphQLNonNull,
    type GraphQLNullableType,
    type GraphQLObjectType,
    type GraphQLSchema,
    buildSchema,
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

const getEnumType = (schema: GraphQLSchema, name: string): GraphQLEnumType => {
    const type = schema.getType(name);

    if (!isEnumType(type)) {
        throw new Error(`Expected ${name} to be an enum type`);
    }

    return type;
};

const getQueryFields = (schema: GraphQLSchema) => {
    const queryType = schema.getQueryType();

    if (!queryType) {
        throw new Error("Schema has no Query type");
    }

    return queryType.getFields();
};

const ofType = (
    type: GraphQLNonNull<GraphQLNullableType>,
): GraphQLNullableType => type.ofType;

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
            "searchStops",
            "closestStops",
            "stopDataLastUpdatedAt",
            "platforms",
            "platform",
            "routes",
            "route",
            "departures",
            "infotexts",
        ];

        it("has all expected query fields", () => {
            const fieldNames = Object.keys(getQueryFields(schema));

            for (const name of EXPECTED_QUERIES) {
                expect(fieldNames).toContain(name);
            }
        });

        it("has no unexpected query fields", () => {
            const fieldNames = Object.keys(getQueryFields(schema));

            for (const name of fieldNames) {
                expect(EXPECTED_QUERIES).toContain(name);
            }
        });

        it("hello returns non-null String", () => {
            const field = getQueryFields(schema).hello;

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                isScalarType(
                    ofType(field.type as GraphQLNonNull<GraphQLNullableType>),
                ),
            ).toBe(true);
        });

        it("stop returns nullable Stop", () => {
            const field = getQueryFields(schema).stop;

            expect(isNonNullType(field.type)).toBe(false);
            expect(isObjectType(field.type)).toBe(true);
            expect((field.type as GraphQLObjectType).name).toBe("Stop");
        });

        it("stops returns non-null list of non-null Stop", () => {
            const field = getQueryFields(schema).stops;

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                isListType(
                    ofType(field.type as GraphQLNonNull<GraphQLNullableType>),
                ),
            ).toBe(true);
        });

        it("searchStops returns non-null list of non-null Stop", () => {
            const field = getQueryFields(schema).searchStops;

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                isListType(
                    ofType(field.type as GraphQLNonNull<GraphQLNullableType>),
                ),
            ).toBe(true);
        });

        it("route returns nullable Route", () => {
            const field = getQueryFields(schema).route;

            expect(isNonNullType(field.type)).toBe(false);
            expect(isObjectType(field.type)).toBe(true);
            expect((field.type as GraphQLObjectType).name).toBe("Route");
        });

        it("platform returns nullable Platform", () => {
            const field = getQueryFields(schema).platform;

            expect(isNonNullType(field.type)).toBe(false);
            expect(isObjectType(field.type)).toBe(true);
            expect((field.type as GraphQLObjectType).name).toBe("Platform");
        });

        it("departures requires stopIds or platformIds arguments", () => {
            const field = getQueryFields(schema).departures;
            const argNames = field.args.map((a) => a.name);

            expect(argNames).toContain("stopIds");
            expect(argNames).toContain("platformIds");
            expect(argNames).toContain("limit");
            expect(argNames).toContain("metroOnly");
            expect(argNames).toContain("minutesBefore");
            expect(argNames).toContain("minutesAfter");
        });

        it("stop query takes required id argument", () => {
            const field = getQueryFields(schema).stop;
            const idArg = field.args.find((a) => a.name === "id");

            if (!idArg) throw new Error("Expected id argument on stop query");

            expect(isNonNullType(idArg.type)).toBe(true);
        });

        it("stops query accepts optional ids, limit, offset", () => {
            const field = getQueryFields(schema).stops;
            const argNames = field.args.map((a) => a.name);

            expect(argNames).toContain("ids");
            expect(argNames).toContain("limit");
            expect(argNames).toContain("offset");

            for (const arg of field.args) {
                expect(isNonNullType(arg.type)).toBe(false);
            }
        });

        it("searchStops query requires query and accepts optional limit, offset, latitude, longitude", () => {
            const field = getQueryFields(schema).searchStops;
            const argNames = field.args.map((a) => a.name);
            const queryArg = field.args.find((a) => a.name === "query");

            expect(argNames).toEqual([
                "query",
                "limit",
                "offset",
                "latitude",
                "longitude",
            ]);

            if (!queryArg) {
                throw new Error("Expected query argument on searchStops query");
            }

            expect(isNonNullType(queryArg.type)).toBe(true);

            for (const arg of field.args.filter((a) => a.name !== "query")) {
                expect(isNonNullType(arg.type)).toBe(false);
            }
        });

        it("stopDataLastUpdatedAt returns nullable ISODateTime with no arguments", () => {
            const field = getQueryFields(schema).stopDataLastUpdatedAt;

            expect(field.args).toHaveLength(0);
            expect(isNonNullType(field.type)).toBe(false);
            expect(isScalarType(field.type)).toBe(true);
            expect(field.type.toString()).toBe("ISODateTime");
        });
    });

    describe("Stop type", () => {
        it("has all required fields", () => {
            const fields = getObjectType(schema, "Stop").getFields();

            expect(fields.id).toBeDefined();
            expect(fields.name).toBeDefined();
            expect(fields.avgLatitude).toBeDefined();
            expect(fields.avgLongitude).toBeDefined();
            expect(fields.entrances).toBeDefined();
            expect(fields.platforms).toBeDefined();
        });

        it("id and name are non-null", () => {
            const fields = getObjectType(schema, "Stop").getFields();

            expect(isNonNullType(fields.id.type)).toBe(true);
            expect(isNonNullType(fields.name.type)).toBe(true);
        });

        it("platforms returns a list of Platform", () => {
            const field = getObjectType(schema, "Stop").getFields().platforms;

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                isListType(
                    ofType(field.type as GraphQLNonNull<GraphQLNullableType>),
                ),
            ).toBe(true);
        });
    });

    describe("Platform type", () => {
        it("has all required fields", () => {
            const fieldNames = Object.keys(
                getObjectType(schema, "Platform").getFields(),
            );

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
            const fields = getObjectType(schema, "Platform").getFields();

            expect(isNonNullType(fields.code.type)).toBe(false);
        });

        it("stop is nullable", () => {
            const fields = getObjectType(schema, "Platform").getFields();

            expect(isNonNullType(fields.stop.type)).toBe(false);
        });

        it("isMetro is non-null Boolean", () => {
            const fields = getObjectType(schema, "Platform").getFields();

            expect(isNonNullType(fields.isMetro.type)).toBe(true);
        });
    });

    describe("Route type", () => {
        it("has all required fields", () => {
            const fieldNames = Object.keys(
                getObjectType(schema, "Route").getFields(),
            );

            expect(fieldNames).toEqual(
                expect.arrayContaining([
                    "id",
                    "name",
                    "color",
                    "directions",
                    "shapes",
                    "isSubstitute",
                    "vehicleType",
                    "isNight",
                ]),
            );
        });

        it("name is nullable", () => {
            const fields = getObjectType(schema, "Route").getFields();

            expect(isNonNullType(fields.name.type)).toBe(false);
        });

        it("color is nullable", () => {
            const fields = getObjectType(schema, "Route").getFields();

            expect(isNonNullType(fields.color.type)).toBe(false);
        });

        it("vehicleType is non-null VehicleType enum", () => {
            const field = getObjectType(schema, "Route").getFields()
                .vehicleType;

            expect(isNonNullType(field.type)).toBe(true);

            const innerType = ofType(
                field.type as GraphQLNonNull<GraphQLNullableType>,
            );

            expect(isEnumType(innerType)).toBe(true);
            expect((innerType as GraphQLNamedType).name).toBe("VehicleType");
        });
    });

    describe("Departure type", () => {
        it("has all required fields", () => {
            const fieldNames = Object.keys(
                getObjectType(schema, "Departure").getFields(),
            );

            expect(fieldNames).toEqual(
                expect.arrayContaining([
                    "id",
                    "delay",
                    "headsign",
                    "isRealtime",
                    "platformCode",
                    "platform",
                    "departureTime",
                    "route",
                ]),
            );
        });

        it("delay is nullable", () => {
            const fields = getObjectType(schema, "Departure").getFields();

            expect(isNonNullType(fields.delay.type)).toBe(false);
        });

        it("route is nullable", () => {
            const fields = getObjectType(schema, "Departure").getFields();

            expect(isNonNullType(fields.route.type)).toBe(false);
        });

        it("platform is non-null", () => {
            const fields = getObjectType(schema, "Departure").getFields();

            expect(isNonNullType(fields.platform.type)).toBe(true);
        });
    });

    describe("DepartureTime type", () => {
        it("has predicted and scheduled as non-null", () => {
            const fields = getObjectType(schema, "DepartureTime").getFields();

            expect(isNonNullType(fields.predicted.type)).toBe(true);
            expect(isNonNullType(fields.scheduled.type)).toBe(true);
        });
    });

    describe("Infotext type", () => {
        it("has all required fields", () => {
            const fieldNames = Object.keys(
                getObjectType(schema, "Infotext").getFields(),
            );

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
            const fields = getObjectType(schema, "Infotext").getFields();

            expect(isNonNullType(fields.textEn.type)).toBe(false);
        });

        it("validFrom and validTo are nullable", () => {
            const fields = getObjectType(schema, "Infotext").getFields();

            expect(isNonNullType(fields.validFrom.type)).toBe(false);
            expect(isNonNullType(fields.validTo.type)).toBe(false);
        });

        it("priority is non-null InfotextPriority enum", () => {
            const field = getObjectType(schema, "Infotext").getFields()
                .priority;

            expect(isNonNullType(field.type)).toBe(true);

            const innerType = ofType(
                field.type as GraphQLNonNull<GraphQLNullableType>,
            );

            expect(isEnumType(innerType)).toBe(true);
            expect((innerType as GraphQLNamedType).name).toBe(
                "InfotextPriority",
            );
        });
    });

    describe("RouteDirection type", () => {
        it("has id and platforms fields", () => {
            const fieldNames = Object.keys(
                getObjectType(schema, "RouteDirection").getFields(),
            );

            expect(fieldNames).toContain("id");
            expect(fieldNames).toContain("platforms");
        });
    });

    describe("RouteShape type", () => {
        it("has id, directionId, tripCount, geoJson", () => {
            const fieldNames = Object.keys(
                getObjectType(schema, "RouteShape").getFields(),
            );

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
            const fieldNames = Object.keys(
                getObjectType(schema, "StopEntrance").getFields(),
            );

            expect(fieldNames).toEqual(
                expect.arrayContaining(["id", "name", "latitude", "longitude"]),
            );
        });

        it("all fields are non-null", () => {
            const fields = getObjectType(schema, "StopEntrance").getFields();

            for (const field of Object.values(fields)) {
                expect(isNonNullType(field.type)).toBe(true);
            }
        });
    });

    describe("InfotextRelatedStop type", () => {
        it("has id, name, and nullable platformCode", () => {
            const fields = getObjectType(
                schema,
                "InfotextRelatedStop",
            ).getFields();

            expect(isNonNullType(fields.id.type)).toBe(true);
            expect(isNonNullType(fields.name.type)).toBe(true);
            expect(isNonNullType(fields.platformCode.type)).toBe(false);
        });
    });

    describe("enums", () => {
        it("VehicleType has all expected values", () => {
            const values = getEnumType(schema, "VehicleType")
                .getValues()
                .map((v) => v.name);

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
            const values = getEnumType(schema, "InfotextPriority")
                .getValues()
                .map((v) => v.name);

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
            const field = getObjectType(schema, "Stop").getFields().platforms;

            // [Platform!]! → NonNull(List(NonNull(Platform)))
            expect(isNonNullType(field.type)).toBe(true);

            const listType = ofType(
                field.type as GraphQLNonNull<GraphQLNullableType>,
            );

            expect(isListType(listType)).toBe(true);

            if (!isListType(listType)) throw new Error("Expected list type");

            const innerType = listType.ofType;

            expect(isNonNullType(innerType)).toBe(true);
            expect(
                (
                    ofType(
                        innerType as GraphQLNonNull<GraphQLNullableType>,
                    ) as GraphQLNamedType
                ).name,
            ).toBe("Platform");
        });

        it("Platform.stop references Stop type", () => {
            const field = getObjectType(schema, "Platform").getFields().stop;

            expect(isObjectType(field.type)).toBe(true);
            expect((field.type as GraphQLObjectType).name).toBe("Stop");
        });

        it("Platform.routes references Route type", () => {
            const field = getObjectType(schema, "Platform").getFields().routes;

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                isListType(
                    ofType(field.type as GraphQLNonNull<GraphQLNullableType>),
                ),
            ).toBe(true);
        });

        it("Departure.platform references Platform type", () => {
            const field = getObjectType(schema, "Departure").getFields()
                .platform;

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                (
                    ofType(
                        field.type as GraphQLNonNull<GraphQLNullableType>,
                    ) as GraphQLNamedType
                ).name,
            ).toBe("Platform");
        });

        it("Departure.route references Route type", () => {
            const field = getObjectType(schema, "Departure").getFields().route;

            expect(isObjectType(field.type)).toBe(true);
            expect((field.type as GraphQLObjectType).name).toBe("Route");
        });

        it("Route.directions references RouteDirection type", () => {
            const field = getObjectType(schema, "Route").getFields().directions;

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                isListType(
                    ofType(field.type as GraphQLNonNull<GraphQLNullableType>),
                ),
            ).toBe(true);
        });

        it("Route.shapes references RouteShape type", () => {
            const field = getObjectType(schema, "Route").getFields().shapes;

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                isListType(
                    ofType(field.type as GraphQLNonNull<GraphQLNullableType>),
                ),
            ).toBe(true);
        });

        it("Stop.entrances references StopEntrance type", () => {
            const field = getObjectType(schema, "Stop").getFields().entrances;

            expect(isNonNullType(field.type)).toBe(true);
            expect(
                isListType(
                    ofType(field.type as GraphQLNonNull<GraphQLNullableType>),
                ),
            ).toBe(true);
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
