import { GtfsFeedId } from "@metro-now/database";
import { RouteResolver } from "src/modules/route/route.resolver";
import type { RouteService } from "src/modules/route/route.service";
import { VehicleType } from "src/types/graphql.generated";

const createMocks = () => {
    const routeService = {
        getOneGraphQL: jest.fn(),
        getManyGraphQL: jest.fn(),
        isSubstitute: jest.fn(),
        isNight: jest.fn(),
        getVehicleTypeForRoute: jest.fn(),
    } as unknown as jest.Mocked<RouteService>;

    const resolver = new RouteResolver(routeService);

    return { resolver, routeService };
};

describe("RouteResolver", () => {
    describe("getOne", () => {
        it("looks up a plain numeric ID with L prefix", () => {
            const { resolver, routeService } = createMocks();

            routeService.getOneGraphQL.mockResolvedValue(null);

            resolver.getOne("991");

            expect(routeService.getOneGraphQL).toHaveBeenCalledWith("L991");
        });

        it("passes through an already-prefixed ID", () => {
            const { resolver, routeService } = createMocks();

            routeService.getOneGraphQL.mockResolvedValue(null);

            resolver.getOne("L991");

            expect(routeService.getOneGraphQL).toHaveBeenCalledWith("L991");
        });

        it("passes through a colon-containing ID", () => {
            const { resolver, routeService } = createMocks();

            routeService.getOneGraphQL.mockResolvedValue(null);

            resolver.getOne("LTL:abc");

            expect(routeService.getOneGraphQL).toHaveBeenCalledWith("LTL:abc");
        });
    });

    describe("getMany", () => {
        it("delegates to routeService.getManyGraphQL", () => {
            const { resolver, routeService } = createMocks();

            routeService.getManyGraphQL.mockResolvedValue([]);

            resolver.getMany();

            expect(routeService.getManyGraphQL).toHaveBeenCalled();
        });
    });

    describe("getIsSubstitute", () => {
        it("delegates to routeService.isSubstitute with route name", () => {
            const { resolver, routeService } = createMocks();

            routeService.isSubstitute.mockReturnValue(true);

            const result = resolver.getIsSubstitute({ name: "X22" } as never);

            expect(routeService.isSubstitute).toHaveBeenCalledWith("X22");
            expect(result).toBe(true);
        });
    });

    describe("getIsNight", () => {
        it("delegates to routeService.isNight with route name", () => {
            const { resolver, routeService } = createMocks();

            routeService.isNight.mockReturnValue(true);

            const result = resolver.getIsNight({
                name: "N21",
                feed: GtfsFeedId.BRATISLAVA,
            } as never);

            expect(routeService.isNight).toHaveBeenCalledWith(
                "N21",
                GtfsFeedId.BRATISLAVA,
            );
            expect(result).toBe(true);
        });
    });

    describe("getVehicleType", () => {
        it("delegates to routeService with route name and gtfs type", () => {
            const { resolver, routeService } = createMocks();

            routeService.getVehicleTypeForRoute.mockReturnValue(
                VehicleType.TRAM,
            );

            const result = resolver.getVehicleType({
                name: "22",
                feed: GtfsFeedId.BRNO,
                type: "0",
            } as never);

            expect(routeService.getVehicleTypeForRoute).toHaveBeenCalledWith({
                feedId: GtfsFeedId.BRNO,
                routeName: "22",
                gtfsRouteType: "0",
            });
            expect(result).toBe(VehicleType.TRAM);
        });

        it("passes empty string when name is missing", () => {
            const { resolver, routeService } = createMocks();

            routeService.getVehicleTypeForRoute.mockReturnValue(
                VehicleType.BUS,
            );

            resolver.getVehicleType({ name: null } as never);

            expect(routeService.getVehicleTypeForRoute).toHaveBeenCalledWith({
                routeName: "",
            });
        });
    });
});
