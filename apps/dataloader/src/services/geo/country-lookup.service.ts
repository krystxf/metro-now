import { fetchWithTimeout } from "../../utils/fetch.utils";
import { logger } from "../../utils/logger";

const NATURAL_EARTH_URL =
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const FETCH_TIMEOUT_MS = 60_000;

type Position = [number, number];
type Ring = Position[];
type PolygonRings = Ring[];

type BoundingBox = {
    minLongitude: number;
    minLatitude: number;
    maxLongitude: number;
    maxLatitude: number;
};

type CountryShape = {
    isoA2: string;
    polygons: PolygonRings[];
    boundingBox: BoundingBox;
};

type GeoJsonFeature = {
    type: "Feature";
    properties: Record<string, unknown> | null;
    geometry:
        | { type: "Polygon"; coordinates: PolygonRings }
        | { type: "MultiPolygon"; coordinates: PolygonRings[] }
        | { type: string; coordinates: unknown };
};

type GeoJsonFeatureCollection = {
    type: "FeatureCollection";
    features: GeoJsonFeature[];
};

export class CountryLookupService {
    private countries: CountryShape[] | null = null;
    private loadPromise: Promise<void> | null = null;

    async getCountry(
        latitude: number,
        longitude: number,
    ): Promise<string | null> {
        await this.ensureLoaded();

        if (!this.countries) {
            return null;
        }

        for (const country of this.countries) {
            if (
                !this.isInsideBoundingBox(
                    latitude,
                    longitude,
                    country.boundingBox,
                )
            ) {
                continue;
            }

            for (const polygon of country.polygons) {
                if (this.isInsidePolygon(longitude, latitude, polygon)) {
                    return country.isoA2;
                }
            }
        }

        return null;
    }

    private async ensureLoaded(): Promise<void> {
        if (this.countries !== null) {
            return;
        }

        if (!this.loadPromise) {
            this.loadPromise = this.load();
        }

        await this.loadPromise;
    }

    private async load(): Promise<void> {
        try {
            const response = await fetchWithTimeout(
                NATURAL_EARTH_URL,
                {},
                FETCH_TIMEOUT_MS,
            );

            if (!response.ok) {
                throw new Error(`${response.status} ${response.statusText}`);
            }

            const geojson = (await response.json()) as GeoJsonFeatureCollection;
            const shapes: CountryShape[] = [];

            for (const feature of geojson.features) {
                const shape = this.toCountryShape(feature);

                if (shape) {
                    shapes.push(shape);
                }
            }

            this.countries = shapes;

            logger.info("Country boundaries loaded", {
                count: shapes.length,
            });
        } catch (error) {
            logger.warn(
                "Failed to load country boundaries; stop country will be null",
                {
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
            this.countries = [];
        }
    }

    private toCountryShape(feature: GeoJsonFeature): CountryShape | null {
        const properties = feature.properties ?? {};
        const candidate =
            (properties.ISO_A2_EH as string | undefined) ??
            (properties.ISO_A2 as string | undefined);

        if (
            typeof candidate !== "string" ||
            candidate.length !== 2 ||
            candidate === "-9"
        ) {
            return null;
        }

        const { geometry } = feature;
        const polygons: PolygonRings[] = [];

        if (geometry.type === "Polygon") {
            polygons.push(geometry.coordinates as PolygonRings);
        } else if (geometry.type === "MultiPolygon") {
            for (const polygon of geometry.coordinates as PolygonRings[]) {
                polygons.push(polygon);
            }
        } else {
            return null;
        }

        return {
            isoA2: candidate.toUpperCase(),
            polygons,
            boundingBox: this.calculateBoundingBox(polygons),
        };
    }

    private calculateBoundingBox(polygons: PolygonRings[]): BoundingBox {
        let minLongitude = Number.POSITIVE_INFINITY;
        let minLatitude = Number.POSITIVE_INFINITY;
        let maxLongitude = Number.NEGATIVE_INFINITY;
        let maxLatitude = Number.NEGATIVE_INFINITY;

        for (const polygon of polygons) {
            for (const ring of polygon) {
                for (const [longitude, latitude] of ring) {
                    if (longitude < minLongitude) minLongitude = longitude;
                    if (latitude < minLatitude) minLatitude = latitude;
                    if (longitude > maxLongitude) maxLongitude = longitude;
                    if (latitude > maxLatitude) maxLatitude = latitude;
                }
            }
        }

        return { minLongitude, minLatitude, maxLongitude, maxLatitude };
    }

    private isInsideBoundingBox(
        latitude: number,
        longitude: number,
        boundingBox: BoundingBox,
    ): boolean {
        return (
            latitude >= boundingBox.minLatitude &&
            latitude <= boundingBox.maxLatitude &&
            longitude >= boundingBox.minLongitude &&
            longitude <= boundingBox.maxLongitude
        );
    }

    private isInsidePolygon(
        longitude: number,
        latitude: number,
        polygon: PolygonRings,
    ): boolean {
        if (polygon.length === 0) {
            return false;
        }

        const [outerRing, ...holes] = polygon;

        if (!outerRing || !this.isInsideRing(longitude, latitude, outerRing)) {
            return false;
        }

        for (const hole of holes) {
            if (this.isInsideRing(longitude, latitude, hole)) {
                return false;
            }
        }

        return true;
    }

    private isInsideRing(
        longitude: number,
        latitude: number,
        ring: Ring,
    ): boolean {
        let inside = false;

        for (
            let current = 0, previous = ring.length - 1;
            current < ring.length;
            previous = current++
        ) {
            const [xCurrent, yCurrent] = ring[current] as Position;
            const [xPrevious, yPrevious] = ring[previous] as Position;
            const straddles = yCurrent > latitude !== yPrevious > latitude;
            const intersects =
                straddles &&
                longitude <
                    ((xPrevious - xCurrent) * (latitude - yCurrent)) /
                        (yPrevious - yCurrent) +
                        xCurrent;

            if (intersects) {
                inside = !inside;
            }
        }

        return inside;
    }
}
