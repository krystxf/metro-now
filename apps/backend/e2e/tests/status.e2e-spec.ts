import { CacheModule } from "@nestjs/cache-manager";
import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { getRequestTestLabel } from "e2e/constant/test-label";
import { cacheModuleConfig } from "src/config/cache-module.config";
import { configModuleConfig } from "src/config/config-module.config";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { StatusModule } from "src/modules/status/status.module";

describe("Status Module (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                CacheModule.register(cacheModuleConfig),
                ConfigModule.forRoot(configModuleConfig),
                PrismaModule,
                StatusModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    test.each(["/status"])(getRequestTestLabel, async (url) => {
        const response = await request(app.getHttpServer())
            .get(url)
            .expect(200)
            .accept("application/json");

        expect(response.body).toBeDefined();
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toEqual(3);
    });

    test.each(["/status/geo-functions"])(getRequestTestLabel, async (url) => {
        const response = await request(app.getHttpServer())
            .get(url)
            .expect(200)
            .accept("application/json");

        expect(response.body).toBeDefined();
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body.service).toEqual("geo-functions");
        expect(response.body.status).toEqual("ok");
    });
});
