import { CacheModule } from "@nestjs/cache-manager";
import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { cacheModuleConfig } from "src/config/cache-module.config";
import { configModuleConfig } from "src/config/config-module.config";
import { DepartureModule } from "src/modules/departure/departure.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";

describe("Departure Module (e2e)", () => {
    let app: INestApplication;
    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                CacheModule.register(cacheModuleConfig),
                ConfigModule.forRoot(configModuleConfig),
                PrismaModule,
                DepartureModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it.each([`U1000Z1`, `U1000Z10`])(
        "[GET] /departure/platform?id=%s",
        async (platform) => {
            const response = await request(app.getHttpServer())
                .get(`/departure/platform?id=${platform}`)
                .expect(200)
                .accept("application/json");

            expect(response.body).toBeDefined();
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
        },
    );
});
