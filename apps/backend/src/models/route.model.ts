import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType({ description: "route" })
export class Route {
    @Field(() => ID)
    id!: string;

    @Field()
    name!: string;
}
