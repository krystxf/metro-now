import { Either, Schema } from "effect";
import { DepartureController } from "src/modules/departure/departure.controller";
import { infoTextSchema } from "src/modules/departure/schema/info-text.schema";
import { golemioResponseSchema } from "src/modules/infotexts/schema/golemio-response.schema";
import { boundingBoxSchema } from "./bounding-box.schema";
import { coerceDate, coerceNumber, integer } from "./coercion";
import { envSchema } from "./env.schema";
import { metroOnlySchema } from "./metro-only.schema";
import { timestampSchema } from "./timestamp.schema";

describe("Effect validation compatibility", () => {
    it("coerces coordinates and strips unknown properties", () => {
        expect(
            Schema.decodeUnknownSync(boundingBoxSchema)({
                latitude: ["50", "51"],
                longitude: ["14", "15"],
                extra: true,
            }),
        ).toEqual({ latitude: [50, 51], longitude: [14, 15] });
        expect(
            Either.isLeft(
                Schema.decodeUnknownEither(boundingBoxSchema)({
                    latitude: ["50"],
                    longitude: ["bad", "15"],
                }),
            ),
        ).toBe(true);
    });

    it("preserves existing boolean and timestamp coercion", () => {
        for (const value of [undefined, null, false, true, "false", "1"]) {
            expect(Schema.decodeUnknownSync(metroOnlySchema)(value)).toBe(
                false,
            );
        }
        expect(Schema.decodeUnknownSync(metroOnlySchema)("true")).toBe(true);
        expect(
            Schema.decodeUnknownSync(timestampSchema)({
                predicted: 123,
                scheduled: null,
            }),
        ).toEqual({ predicted: "123", scheduled: "null" });
        expect(Schema.decodeUnknownSync(coerceNumber)(null)).toBe(0);
        expect(
            Schema.decodeUnknownSync(coerceNumber.pipe(integer))(
                "100000000000000000000",
            ),
        ).toBe(1e20);
        expect(
            Either.isLeft(Schema.decodeUnknownEither(coerceNumber)("bad")),
        ).toBe(true);
        expect(
            Either.isLeft(Schema.decodeUnknownEither(coerceDate)("bad")),
        ).toBe(true);
    });

    it("preserves date coercion for nullable upstream infotext dates", () => {
        const decode = Schema.decodeUnknownSync(infoTextSchema);
        const entry = {
            valid_from: null,
            valid_to: "2026-01-01T00:00:00Z",
            text: "hello",
            related_stops: [],
        };
        expect(decode(entry)).toMatchObject({
            valid_from: new Date(0),
            valid_to: new Date("2026-01-01T00:00:00Z"),
        });
        expect(
            decode({ text: "hello", related_stops: [] }).valid_from,
        ).toBeUndefined();
    });

    it("validates environment ports and accepts an empty optional Transitland key", () => {
        const env = {
            POSTGRES_USER: "user",
            POSTGRES_PASSWORD: "pass",
            POSTGRES_DB: "db",
            DB_HOST: "localhost",
            DB_PORT: "5432",
            DB_SCHEMA: "public",
            GOLEMIO_API_KEY: "key",
            TRANSIT_LAND_API_KEY: "",
        };
        expect(Schema.decodeUnknownSync(envSchema)(env)).toMatchObject({
            DB_PORT: 5432,
        });
        for (const DB_PORT of ["bad", "0", "1.5"]) {
            expect(
                Either.isLeft(
                    Schema.decodeUnknownEither(envSchema)({ ...env, DB_PORT }),
                ),
            ).toBe(true);
        }
    });

    it("transforms upstream priority and rejects unsupported values", () => {
        const entry = {
            id: "1",
            valid_from: null,
            valid_to: null,
            text: "hello",
            text_en: null,
            display_type: "all",
            priority: "high",
            related_stops: [],
        };
        expect(
            Schema.decodeUnknownSync(golemioResponseSchema)([entry])[0]
                .priority,
        ).toBe("HIGH");
        expect(
            Either.isLeft(
                Schema.decodeUnknownEither(golemioResponseSchema)([
                    { ...entry, priority: "urgent" },
                ]),
            ),
        ).toBe(true);
    });

    it("keeps v2 query defaults and nulls at the controller boundary", async () => {
        const getDepartures = jest.fn().mockResolvedValue([]);
        const controller = new DepartureController(
            {} as never,
            { getDepartures } as never,
        );
        await controller.getDeparturesV2({ stop: ["stop"] });
        expect(getDepartures).toHaveBeenLastCalledWith({
            stopIds: ["stop"],
            platformIds: [],
            vehicleType: "all",
            excludeVehicleType: null,
            limit: null,
            totalLimit: null,
            minutesBefore: 0,
            minutesAfter: 120,
        });
        await controller.getDeparturesV2({
            platform: ["platform"],
            limit: "3",
            minutesAfter: "0",
        });
        expect(getDepartures).toHaveBeenLastCalledWith(
            expect.objectContaining({ limit: 3, minutesAfter: 0 }),
        );
        await expect(
            controller.getDeparturesV2({ stop: ["stop"], limit: "1.5" }),
        ).rejects.toMatchObject({ status: 400 });
        await expect(controller.getDeparturesV2({})).rejects.toMatchObject({
            status: 400,
        });
    });
});
