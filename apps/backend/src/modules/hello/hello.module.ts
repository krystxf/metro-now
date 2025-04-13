import { Module } from "@nestjs/common";

import { HelloResolver } from "src/modules/hello/hello.resolver";

@Module({
    providers: [HelloResolver],
})
export class HelloModule {}
