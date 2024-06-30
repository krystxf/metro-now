import { Test, TestingModule } from "@nestjs/testing";
import { MetroController } from "./metro.controller";

describe("MetroController", () => {
    let controller: MetroController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MetroController],
        }).compile();

        controller = module.get<MetroController>(MetroController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
