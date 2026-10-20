import * as XLSX from "xlsx";

export type Sr70Station = {
    cisCode: string;
    name: string;
    latitude: number;
    longitude: number;
};

const parseCzechGpsCoordinate = (value: string): number => {
    if (typeof value !== "string") {
        return 0;
    }

    const cleaned = value
        .replace(/^[NESW]/, "")
        .replace(/°$/, "")
        .replace(",", ".");

    const parsed = Number.parseFloat(cleaned);

    return Number.isFinite(parsed) ? parsed : 0;
};

export const parseSr70Xlsx = (
    xlsxBuffer: Buffer,
): Map<string, Sr70Station> => {
    const stations = new Map<string, Sr70Station>();
    const workbook = XLSX.read(xlsxBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        return stations;
    }

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
        return stations;
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        raw: false,
    });

    for (const row of rows) {
        const evidencniCislo = row["Evidenční číslo"];

        if (!evidencniCislo) {
            continue;
        }

        const fullNumber = Number.parseInt(evidencniCislo, 10);

        if (!Number.isInteger(fullNumber)) {
            continue;
        }

        const cisCode = String(Math.floor(fullNumber / 10));
        const name = row["Název"] ?? row["Název 20"] ?? "";
        const latStr = row["GPS N (DEG)"] ?? "";
        const lonStr = row["GPS E (DEG)"] ?? "";

        if (!latStr || !lonStr) {
            continue;
        }

        const latitude = parseCzechGpsCoordinate(latStr);
        const longitude = parseCzechGpsCoordinate(lonStr);

        if (latitude === 0 || longitude === 0) {
            continue;
        }

        if (!stations.has(cisCode)) {
            stations.set(cisCode, { cisCode, name, latitude, longitude });
        }
    }

    return stations;
};
