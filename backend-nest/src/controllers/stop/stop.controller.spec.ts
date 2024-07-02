import { Test, TestingModule } from "@nestjs/testing";
import { StopController } from "./stop.controller";

describe("StopController", () => {
    let controller: StopController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [StopController],
        }).compile();

        controller = module.get<StopController>(StopController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
