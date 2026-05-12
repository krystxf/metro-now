import type { SyncSnapshot } from "../../types/sync.types";
import { AmbImportService } from "./amb-import.service";
import { BratislavaImportService } from "./bratislava-import.service";
import { BrnoImportService } from "./brno-import.service";
import { FgcImportService } from "./fgc-import.service";
import { LeoImportService } from "./leo-import.service";
import { LiberecImportService } from "./liberec-import.service";
import { PmdpImportService } from "./pmdp-import.service";
import { TmbImportService } from "./tmb-import.service";
import { TramImportService } from "./tram-import.service";
import { UstiImportService } from "./usti-import.service";
import { ZsrImportService } from "./zsr-import.service";

export type CityImportContext = {
    pidStops: SyncSnapshot["stops"];
};

export type CityImport = {
    name: string;
    load: (context: CityImportContext) => Promise<SyncSnapshot>;
};

export const cityImports: CityImport[] = [
    {
        name: "Leo",
        load: ({ pidStops }) => new LeoImportService().getLeoSnapshot(pidStops),
    },
    {
        name: "PMDP",
        load: () => new PmdpImportService().getPmdpSnapshot(),
    },
    {
        name: "Brno",
        load: () => new BrnoImportService().getBrnoSnapshot(),
    },
    {
        name: "Usti",
        load: () => new UstiImportService().getUstiSnapshot(),
    },
    {
        name: "Liberec",
        load: () => new LiberecImportService().getLiberecSnapshot(),
    },
    {
        name: "Bratislava",
        load: () => new BratislavaImportService().getBratislavaSnapshot(),
    },
    {
        name: "ZSR",
        load: ({ pidStops }) => new ZsrImportService().getZsrSnapshot(pidStops),
    },
    {
        name: "TMB",
        load: () => new TmbImportService().getTmbSnapshot(),
    },
    {
        name: "AMB",
        load: () => new AmbImportService().getAmbSnapshot(),
    },
    {
        name: "TRAM",
        load: () => new TramImportService().getTramSnapshot(),
    },
    {
        name: "FGC",
        load: () => new FgcImportService().getFgcSnapshot(),
    },
];
