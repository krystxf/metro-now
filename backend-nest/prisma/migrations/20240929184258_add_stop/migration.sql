-- DropIndex
DROP INDEX "Platform_latitude_idx";

-- DropIndex
DROP INDEX "Platform_latitude_longitude_idx";

-- DropIndex
DROP INDEX "Platform_longitude_idx";

-- DropIndex
DROP INDEX "Platform_name_idx";

-- DropIndex
DROP INDEX "Route_name_idx";

-- AlterTable
ALTER TABLE "Platform" ADD COLUMN     "stopId" TEXT;

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avgLatitude" DOUBLE PRECISION NOT NULL,
    "avgLongitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Platform" ADD CONSTRAINT "Platform_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
