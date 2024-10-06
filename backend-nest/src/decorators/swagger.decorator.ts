import { applyDecorators } from "@nestjs/common";
import { ApiQuery, type ApiQueryOptions } from "@nestjs/swagger";

export const ApiQueries = (queries: ApiQueryOptions[]) => {
    const decorators = queries.map((query) => ApiQuery(query));

    return applyDecorators(...decorators);
};

export { ApiOperation as ApiDescription } from "@nestjs/swagger";
