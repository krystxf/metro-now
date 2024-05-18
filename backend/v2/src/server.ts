import express from "express";
import { PORT } from "./const";
import { routes } from "./routes";

const app = express();

app.use(express.json());

app.use("/", routes);

app.listen(PORT, () => {
    console.log(`🚀 Backend is running on http://localhost:${PORT}`);
});
