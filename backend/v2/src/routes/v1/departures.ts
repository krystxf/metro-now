import { Router } from "express";

export const departuresRoute = Router();

departuresRoute.get("/departures", (req, res) => {
    res.json({ message: "Departures route is working!" });
});
