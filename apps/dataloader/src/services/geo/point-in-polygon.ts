export type Position = [number, number];
export type Ring = Position[];
export type PolygonRings = Ring[];

export type BoundingBox = {
    minLongitude: number;
    minLatitude: number;
    maxLongitude: number;
    maxLatitude: number;
};

export const calculateBoundingBox = (polygons: PolygonRings[]): BoundingBox => {
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
};

export const isInsideBoundingBox = (
    latitude: number,
    longitude: number,
    boundingBox: BoundingBox,
): boolean =>
    latitude >= boundingBox.minLatitude &&
    latitude <= boundingBox.maxLatitude &&
    longitude >= boundingBox.minLongitude &&
    longitude <= boundingBox.maxLongitude;

export const isInsideRing = (
    longitude: number,
    latitude: number,
    ring: Ring,
): boolean => {
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
};

export const isInsidePolygon = (
    longitude: number,
    latitude: number,
    polygon: PolygonRings,
): boolean => {
    if (polygon.length === 0) {
        return false;
    }

    const [outerRing, ...holes] = polygon;

    if (!outerRing || !isInsideRing(longitude, latitude, outerRing)) {
        return false;
    }

    for (const hole of holes) {
        if (isInsideRing(longitude, latitude, hole)) {
            return false;
        }
    }

    return true;
};
