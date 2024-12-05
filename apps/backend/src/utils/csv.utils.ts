import { parseString } from "@fast-csv/parse";

export async function parseCsvString<T>(csvString: string): Promise<T[]> {
    return new Promise((resolve) => {
        const rows: T[] = [];

        parseString(csvString, { headers: true })
            .on("error", (error) => console.error(error))
            .on("data", (row) => rows.push(row))
            .on("end", () => {
                resolve(rows);
            });
    });
}
