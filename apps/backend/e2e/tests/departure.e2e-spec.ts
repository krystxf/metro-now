import { CacheModule } from "@nestjs/cache-manager";
import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { getRequestTestLabel } from "e2e/constant/test-label";
import {
    generateParamsArray,
    generateTestUrls,
} from "e2e/utils/generate-test-urls";
import { cacheModuleConfig } from "src/config/cache-module.config";
import { configModuleConfig } from "src/config/config-module.config";
import { DepartureModule } from "src/modules/departure/departure.module";
import { LoggerModule } from "src/modules/logger/logger.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";

describe("Departure Module (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                CacheModule.register(cacheModuleConfig),
                ConfigModule.forRoot(configModuleConfig),
                PrismaModule,
                LoggerModule,
                DepartureModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    const testUrls = generateTestUrls("/departure", [
        [...generateParamsArray("platform[]", "U1000Z1P")],

        [...generateParamsArray("platform[]", ["U1000Z1P", "U1000Z1P"])],

        [
            ...generateParamsArray("platform[]", ["U1000Z1P", "U1000Z1P"]),
            ...generateParamsArray("stop[]"),
        ],

        [...generateParamsArray("stop[]", "U1000")],

        [
            ...generateParamsArray("stop[]", "U1000"),
            ...generateParamsArray("platform[]"),
        ],

        [
            ...generateParamsArray("platform[]", ["U1000Z1P", "U1000Z1P"]),
            ...generateParamsArray("stop[]", "U1000"),
        ],

        [
            ...generateParamsArray("platform[]", ["U1000Z1P", "U1000Z1P"]),
            ...generateParamsArray("stop[]", "U1000"),
            ...generateParamsArray("metroOnly", "true"),
        ],

        [
            ...generateParamsArray("platform[]", ["U1000Z1P", "U1000Z1P"]),
            ...generateParamsArray("stop[]", "U1000"),
            ...generateParamsArray("metroOnly", false),
        ],

        [
            ...generateParamsArray("stop[]", ["U1000"]),
            ...generateParamsArray("metroOnly", true),
        ],

        [
            ...generateParamsArray("stop[]", "U1000"),
            ...generateParamsArray("metroOnly", false),
        ],

        [
            ...generateParamsArray("stop[]", [
                "U1",
                "U10",
                "U100",
                "U1000",
                "U1001",
                "U1002",
                "U1004",
                "U1006",
                "U1007",
                "U1008",
                "U1009",
                "U1010",
                "U1011",
                "U1012",
                "U1013",
            ]),
        ],
    ]);

    test.each(testUrls)(getRequestTestLabel, async (url) => {
        const response = await request(app.getHttpServer())
            .get(url)
            .expect(200)
            .accept("application/json");

        expect(response.body).toBeDefined();
        expect(response.body).toBeInstanceOf(Array);
    });
});
