import type { ApiQueryOptions } from "@nestjs/swagger";

export const metroOnlyQuery = {
    name: "metroOnly",
    allowEmptyValue: true,
    type: Boolean,
    example: false,
    description:
        "if set to `true` returns only metro results, otherwise returns all results (including metro). Defaults to `false`.",
    required: false,
} as const satisfies ApiQueryOptions;

export const latitudeQuery = {
    name: "latitude",
    type: Number,
    description: "latitude as number",
    example: 14.415868050223628,
} as const satisfies ApiQueryOptions;

export const longitudeQuery = {
    name: "longitude",
    type: Number,
    description: "longitude as number",
    example: 50.08187897724985,
} as const satisfies ApiQueryOptions;

export const boundingBoxQuery = [
    {
        name: "latitude[]",
        description:
            "Min and max latitude as an array of two numbers in any order",
        isArray: true,
        type: Number,
        example: [14.369044977369585, 14.480682877858126],
    },
    {
        name: "longitude[]",
        description:
            "Min and max longitude as an array of two numbers in any order",
        isArray: true,
        type: Number,
        example: [50.10205577526802, 50.04379077770145],
    },
] as const satisfies ApiQueryOptions[];
