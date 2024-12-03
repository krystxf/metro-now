import { Open as unzipperOpen } from "unzipper";

/**
 * Unzips the response and returns the directory.
 * @example
 * const response = await fetch(zip_url);
 * const directory = await unzipResponse(response);
 *
 * for (const file of directory.files) {
 *     const fileBuffer = await file.buffer();
 *     const fileContent = fileBuffer.toString();
 * }
 */
export const unzipResponse = async (response: Response) => {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const directory = await unzipperOpen.buffer(buffer);

    return directory;
};
