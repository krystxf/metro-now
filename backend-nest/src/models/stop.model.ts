import { Field, ID, ObjectType } from "@nestjs/graphql";

import { Platform } from "src/models/platform.model";

@ObjectType({ description: "stop" })
export class Stop {
    @Field(() => ID)
    id!: string;

    @Field()
    name!: string;

    @Field()
    avgLatitude!: number;

    @Field()
    avgLongitude!: number;

    @Field(() => [Platform])
    platforms!: Platform[];
}
