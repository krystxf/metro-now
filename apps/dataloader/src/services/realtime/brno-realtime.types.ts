export type KordisVehicleAttributes = {
    LineName: string;
    Delay: number;
    LastStopID: number;
    FinalStopID: number;
};

export type KordisFeature = {
    attributes: KordisVehicleAttributes;
};

export type KordisQueryResponse = {
    features: KordisFeature[];
};

export type BrnoVehicle = {
    line: string;
    delay: number;
    lastStop: number;
    finalStop: number;
};

export type BrnoRealtimeData = {
    updatedAt: string;
    vehicles: BrnoVehicle[];
};

export type BrnoRealtimeStatus = {
    polling: boolean;
    lastUpdateAt: string | null;
    lastError: string | null;
    vehicleCount: number;
    routeCount: number;
};
