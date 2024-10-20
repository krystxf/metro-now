import { CacheModule } from "@nestjs/cache-manager";
import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { cacheModuleConfig } from "src/config/cache-module.config";
import { configModuleConfig } from "src/config/config-module.config";
import { LoggerModule } from "src/modules/logger/logger.module";
import { PlatformModule } from "src/modules/platform/platform.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import {
    generateCombinations,
    generatePermutations,
} from "src/utils/combination.utils";

describe("Platform Module (e2e)", () => {
    let app: INestApplication;
    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                CacheModule.register(cacheModuleConfig),
                ConfigModule.forRoot(configModuleConfig),
                PrismaModule,
                LoggerModule,
                PlatformModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it.each([
        "/platform/all",
        "/platform/all?metroOnly",
        "/platform/all?metroOnly=false",
        "/platform/all?metroOnly=true",
    ])("[GET] %s", async (url) => {
        const response = await request(app.getHttpServer())
            .get(url)
            .expect(200)
            .accept("application/json");

        expect(response.body).toBeDefined();
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);
    });

    const latitude = 14.415868050223628;
    const longitude = 50.08187897724985;

    const allMetroOlyParams = [
        "",
        "&metroOnly",
        "&metroOnly=false",
        "&metroOnly=true",
    ];
    const allCountParams = [
        "",
        "&count=1",
        "&count=2",
        "&count=3",
        "&count=400",
        "&count=2000",
    ];
    const allLatLongParams = generatePermutations([
        `&latitude=${latitude}`,
        `&longitude=${longitude}`,
    ]).map((value) => value.join(""));

    const urls: string[] = generateCombinations([
        allLatLongParams,
        allMetroOlyParams,
        allCountParams,
    ]).map((value) => `/platform/closest?${value.join("")}`);

    it.each(urls)("[GET] %s", async (params) => {
        const response = await request(app.getHttpServer())
            .get(`${params}`)
            .expect(200)
            .accept("application/json");

        expect(response.body).toBeDefined();
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);
    });
});
