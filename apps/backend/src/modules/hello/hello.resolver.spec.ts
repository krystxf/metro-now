import { Test, TestingModule } from "@nestjs/testing";

import { HelloResolver } from "src/modules/hello/hello.resolver";

describe("HelloResolver", () => {
    let resolver: HelloResolver;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HelloResolver],
        }).compile();

        resolver = module.get<HelloResolver>(HelloResolver);
    });

    it("should be defined", () => {
        expect(resolver).toBeDefined();
    });
});
