-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM (
    'METRO',
    'BUS',
    'TRAM',
    'TRAIN',
    'FERRY',
    'FUNICULAR'
);

-- AlterTable
ALTER TABLE "Route"
ADD COLUMN "isNight" BOOLEAN,
ADD COLUMN "vehicleType" "VehicleType";