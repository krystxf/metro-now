/**
 * Checks if the given HTTP status code represents a successful response.
 * @param statusCode - The HTTP status code to check.
 * @returns True if the status code is in the range [200, 300), false otherwise.
 */
export const isSuccess = (statusCode: number): boolean => {
    // Ensure the status code is a positive integer
    const code = Math.floor(Math.abs(statusCode));
    return code >= 200 && code < 300;
};
