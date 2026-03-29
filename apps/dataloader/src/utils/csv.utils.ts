import { parseString } from "@fast-csv/parse";

export async function parseCsvString<T>(csvString: string): Promise<T[]> {
    return await new Promise<T[]>((resolve, reject) => {
        const rows: T[] = [];

        parseString(csvString, { headers: true })
            .on("error", (error) => reject(error))
            .on("data", (row) => rows.push(row))
            .on("end", () => resolve(rows));
    });
}
