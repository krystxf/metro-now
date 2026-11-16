import { Schema } from "effect";
import { coerceNumber, integer } from "src/schema/coercion";

const port = coerceNumber.pipe(integer, Schema.positive());
const nonEmptyString = Schema.String.pipe(Schema.minLength(1));

export const envSchema = Schema.Struct({
    DATABASE_URL: Schema.optional(Schema.String),
    POSTGRES_USER: nonEmptyString,
    POSTGRES_PASSWORD: nonEmptyString,
    POSTGRES_DB: nonEmptyString,
    DB_HOST: nonEmptyString,
    DB_PORT: port,
    DB_SCHEMA: nonEmptyString,
    REDIS_HOST: Schema.optional(nonEmptyString),
    REDIS_PORT: Schema.optional(port),
    PORT: Schema.optional(port),
    LOGS: Schema.optional(Schema.String),
    GOLEMIO_API_KEY: nonEmptyString,
    TRANSIT_LAND_API_KEY: Schema.optionalWith(
        Schema.compose(
            Schema.transform(Schema.Unknown, Schema.Unknown, {
                strict: false,
                decode: (value) => (value === "" ? undefined : value),
                encode: (value) => value,
            }),
            Schema.UndefinedOr(nonEmptyString),
        ),
        {},
    ),
});

export type EnvSchema = Schema.Schema.Type<typeof envSchema>;
