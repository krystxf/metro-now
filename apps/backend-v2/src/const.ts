import dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3002");

const GOLEMIO_API_KEY = process.env.GOLEMIO_API_KEY;
if (!GOLEMIO_API_KEY) {
    throw new Error("GOLEMIO_API_KEY is not set in .env");
}

export { GOLEMIO_API_KEY, PORT };
