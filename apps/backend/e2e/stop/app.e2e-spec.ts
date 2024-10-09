import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { AppModule } from "src/app.module";

describe("AppController (e2e)", () => {
    let app: INestApplication;
    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it("/stop/all (GET)", () => {
        return request(app.getHttpServer())
            .get("/stop/all")
            .expect(200)
            .accept("application/json");
    });
});
