import express from "express";
import { v1routes } from "./v1";

export const routes = express.Router();

routes.use("/v1", v1routes);

routes.get("/", (req, res) => {
    res.send(`Server is running! 🚀`);
});
