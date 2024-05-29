import express from "express";
import { departuresRoute } from "./metro/departures";

export const v1routes = express.Router();

v1routes.use("/metro", departuresRoute);
