import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test, type TestingModule } from "@nestjs/testing";

import { InfotextsResolver } from "src/modules/infotexts/infotexts.resolver";
import { InfotextsService } from "src/modules/infotexts/infotexts.service";

describe("InfotextResolver", () => {
    let resolver: InfotextsResolver;
    const infotextsService = {
        getAll: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InfotextsResolver,
                {
                    provide: InfotextsService,
                    useValue: infotextsService,
                },
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
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(resolver).toBeDefined();
    });

    it("returns infotexts from the service", async () => {
        infotextsService.getAll.mockResolvedValue([
            {
                id: "58d0c029-b296-48ab-b458-521dcbb37224",
                relatedStops: [
                    {
                        id: "U337Z12P",
                        name: "Lihovar",
                        platformCode: "D",
                    },
                ],
            },
        ]);

        const result = await resolver.getMultiple();

        expect(infotextsService.getAll).toHaveBeenCalled();
        expect(result).toEqual([
            {
                id: "58d0c029-b296-48ab-b458-521dcbb37224",
                relatedStops: [
                    {
                        id: "U337Z12P",
                        name: "Lihovar",
                        platformCode: "D",
                    },
                ],
            },
        ]);
    });
});
