import { Field, ID, ObjectType } from "@nestjs/graphql";

import { Route } from "src/models/route.model";

@ObjectType({ description: "platform" })
export class Platform {
    @Field(() => ID)
    id!: string;

    @Field()
    name!: string;

    @Field()
    latitude!: number;

    @Field()
    longitude!: number;

    @Field(() => [Route])
    routes!: Route[];
}
