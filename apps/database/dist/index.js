"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.VehicleType = exports.sql = void 0;
var kysely_1 = require("kysely");
Object.defineProperty(exports, "sql", { enumerable: true, get: function () { return kysely_1.sql; } });
exports.VehicleType = {
    BUS: "BUS",
    FERRY: "FERRY",
    FUNICULAR: "FUNICULAR",
    METRO: "METRO",
    TRAIN: "TRAIN",
    TRAM: "TRAM",
};
exports.LogLevel = {
    error: "error",
    info: "info",
    warn: "warn",
};
//# sourceMappingURL=index.js.map