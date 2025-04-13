import { Test, TestingModule } from "@nestjs/testing";

import { PlatformService } from "src/modules/platform/platform.service";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { StopResolver } from "src/modules/stop/stop.resolver";
import { StopService } from "src/modules/stop/stop.service";

describe("StopResolver", () => {
    let resolver: StopResolver;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StopResolver,
                StopService,
                PlatformService,
                {
                    provide: PrismaService,
                    useValue: {
                        stop: {
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            findFirst: jest.fn(),
                        },
                        platform: {
                            findMany: jest.fn(),
                        },
                        $transaction: jest.fn(),
                    },
                },
            ],
        }).compile();

        resolver = module.get<StopResolver>(StopResolver);
    });

    it("should be defined", () => {
        expect(resolver).toBeDefined();
    });
});
