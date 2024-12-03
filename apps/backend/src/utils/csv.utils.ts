import * as csv from "@fast-csv/parse";

export const parseCsvContents = <T>(contents: string): Promise<T[]> => {
    return new Promise<T[]>((resolve) => {
        const data: T[] = [];

        csv.parseString(contents, { headers: true })
            .on("error", (error) => console.error(error))
            .on("data", (row) => {
                if (!row) return;

                data.push(row);
            })
            .on("end", () => resolve(data));
    });
};
