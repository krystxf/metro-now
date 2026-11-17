import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";

import { InfotextsService } from "src/modules/infotexts/infotexts.service";
import { InfotextsController } from "src/modules/infotexts/legacy/infotexts.controller";

describe("InfotextsController", () => {
    it("serves infotexts through the controller", async () => {
        const infotextsService = {
            getAll: jest.fn().mockResolvedValue([{ id: 1 }]),
        };
        const moduleRef = await Test.createTestingModule({
            imports: [CacheModule.register()],
            controllers: [InfotextsController],
            providers: [
                {
                    provide: InfotextsService,
                    useValue: infotextsService,
                },
            ],
        }).compile();
        const controller = moduleRef.get(InfotextsController);

        await expect(controller.getInfotextsV1()).resolves.toEqual([{ id: 1 }]);
        expect(infotextsService.getAll).toHaveBeenCalledTimes(1);
    });
});
