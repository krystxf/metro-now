import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService, WELCOME_MESSAGE } from "./app.service";

describe("AppController", () => {
    let appController: AppController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService],
        }).compile();

        appController = app.get<AppController>(AppController);
    });

    describe("root", () => {
        it("should return welcome message", () => {
            expect(appController.getHello()).toBe(WELCOME_MESSAGE);
        });
    });
});
