import express from "express";
import { departuresRoute } from "./departures";

export const v1routes = express.Router();

v1routes.use(departuresRoute);
