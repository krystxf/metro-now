import { GRAPHQL_URL } from "@/constants/api";
import { GraphQLClient } from "graphql-request";

export const graphqlClient = new GraphQLClient(GRAPHQL_URL);
