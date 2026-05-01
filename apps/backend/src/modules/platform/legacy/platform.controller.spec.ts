import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";

import { PlatformController } from "src/modules/platform/legacy/platform.controller";
import { PlatformService } from "src/modules/platform/platform.service";

describe("PlatformController", () => {
    const platformService = {
        getAll: jest.fn(),
        getPlatformsByDistance: jest.fn(),
        getPlatformsInBoundingBox: jest.fn(),
    };

    const createController = async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheModule.register()],
            controllers: [PlatformController],
            providers: [
                {
                    provide: PlatformService,
                    useValue: platformService,
                },
            ],
        }).compile();

        return moduleRef.get(PlatformController);
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("validates and forwards platform list queries", async () => {
        platformService.getAll.mockResolvedValue([
            {
                id: "P1",
                latitude: 50,
                longitude: 14,
                name: "Můstek",
                direction: null,
                routes: [],
            },
        ]);
        const controller = await createController();

        await expect(
            controller.getAllPlatformsV1({ metroOnly: "true" }),
        ).resolves.toHaveLength(1);
        expect(platformService.getAll).toHaveBeenCalledWith({
            metroOnly: true,
        });
    });

    it("validates closest-platform queries", async () => {
        platformService.getPlatformsByDistance.mockResolvedValue([]);
        const controller = await createController();

        await expect(
            controller.getPlatformsByDistanceV1({
                latitude: "50.1",
                longitude: "14.4",
                count: "2",
                metroOnly: "false",
            }),
        ).resolves.toEqual([]);
        expect(platformService.getPlatformsByDistance).toHaveBeenCalledWith({
            latitude: 50.1,
            longitude: 14.4,
            count: 2,
            metroOnly: false,
        });

        await expect(
            controller.getPlatformsByDistanceV1({
                longitude: "14.4",
                count: "2",
                metroOnly: "false",
            }),
        ).rejects.toThrow();
    });

    it("validates bounding-box queries", async () => {
        platformService.getPlatformsInBoundingBox.mockResolvedValue([]);
        const controller = await createController();

        await expect(
            controller.getPlatformsInBoundingBoxV1({
                latitude: ["50", "51"],
                longitude: ["14", "15"],
                metroOnly: "true",
            }),
        ).resolves.toEqual([]);
        expect(platformService.getPlatformsInBoundingBox).toHaveBeenCalledWith({
            boundingBox: {
                latitude: [50, 51],
                longitude: [14, 15],
            },
            metroOnly: true,
        });

        await expect(
            controller.getPlatformsInBoundingBoxV1({
                latitude: "50",
                longitude: ["14", "15"],
            }),
        ).rejects.toThrow("Invalid query params");
    });
});
