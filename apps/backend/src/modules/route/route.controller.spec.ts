import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";

import { RouteController } from "src/modules/route/route.controller";
import { RouteService } from "src/modules/route/route.service";

describe("RouteController", () => {
    it("serves route details through the controller", async () => {
        const routeService = {
            getOneGraphQL: jest.fn().mockResolvedValue({ id: "R1", name: "A" }),
        };
        const moduleRef = await Test.createTestingModule({
            imports: [CacheModule.register()],
            controllers: [RouteController],
            providers: [
                {
                    provide: RouteService,
                    useValue: routeService,
                },
            ],
        }).compile();
        const controller = moduleRef.get(RouteController);

        await expect(controller.getRoute("R1")).resolves.toEqual({
            id: "R1",
            name: "A",
        });
        expect(routeService.getOneGraphQL).toHaveBeenCalledWith("R1");
    });

    it("rejects non-string route identifiers", async () => {
        const routeService = {
            getOneGraphQL: jest.fn(),
        };
        const moduleRef = await Test.createTestingModule({
            imports: [CacheModule.register()],
            controllers: [RouteController],
            providers: [
                {
                    provide: RouteService,
                    useValue: routeService,
                },
            ],
        }).compile();
        const controller = moduleRef.get(RouteController);

        await expect(controller.getRoute(null)).rejects.toThrow(
            "Missing route ID",
        );
    });
});
