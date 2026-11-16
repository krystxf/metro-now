import { Open } from "unzipper";
import { LeoGtfsService } from "./leo-gtfs.service";

jest.mock("unzipper", () => ({ Open: { buffer: jest.fn() } }));

describe("Leo GTFS effects", () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });
    const createService = () =>
        new LeoGtfsService({
            wrap: (_key: string, load: () => Promise<unknown>) => load(),
        } as never);

    it("rejects HTML error pages before opening an archive", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue(
            new Response("<html>not found</html>"),
        );
        await expect(createService().getCatalog()).rejects.toMatchObject({
            _tag: "UpstreamError",
            operation: "archive validation (not a ZIP file)",
        });
        expect(Open.buffer).not.toHaveBeenCalled();
    });
    it("preserves missing-file errors as the typed error cause", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue(
            new Response("PK archive"),
        );
        jest.mocked(Open.buffer).mockResolvedValue({ files: [] } as never);
        await expect(createService().getCatalog()).rejects.toMatchObject({
            _tag: "UpstreamError",
            operation: "archive decoding",
            cause: new Error("Leo GTFS archive is missing 'agency.txt'"),
        });
    });
});
