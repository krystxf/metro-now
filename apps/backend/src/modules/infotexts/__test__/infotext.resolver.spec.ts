import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test, TestingModule } from "@nestjs/testing";

import { GolemioService } from "src/modules/golemio/golemio.service";
import { InfotextsResolver } from "src/modules/infotexts/infotexts.resolver";
import { InfotextsService } from "src/modules/infotexts/infotexts.service";

describe("InfotextResolver", () => {
    let resolver: InfotextsResolver;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InfotextsResolver,
                InfotextsService,
                GolemioService,
                {
                    provide: CACHE_MANAGER,
                    useValue: {
                        get: jest.fn(),
                        set: jest.fn(),
                        del: jest.fn(),
                        reset: jest.fn(),
                    },
                },
            ],
        }).compile();

        resolver = module.get<InfotextsResolver>(InfotextsResolver);
    });

    it("should be defined", () => {
        expect(resolver).toBeDefined();
    });
});
