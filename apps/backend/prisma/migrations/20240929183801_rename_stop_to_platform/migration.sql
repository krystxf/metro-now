/*
  Warnings:

  - You are about to drop the `Stop` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StopsOnRoutes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StopsOnRoutes" DROP CONSTRAINT "StopsOnRoutes_routeId_fkey";

-- DropForeignKey
ALTER TABLE "StopsOnRoutes" DROP CONSTRAINT "StopsOnRoutes_stopId_fkey";

-- DropTable
DROP TABLE "Stop";

-- DropTable
DROP TABLE "StopsOnRoutes";

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isMetro" BOOLEAN NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformsOnRoutes" (
    "stopId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformsOnRoutes_pkey" PRIMARY KEY ("stopId","routeId")
);

-- CreateIndex
CREATE INDEX "Platform_name_idx" ON "Platform"("name");

-- CreateIndex
CREATE INDEX "Platform_latitude_idx" ON "Platform"("latitude");

-- CreateIndex
CREATE INDEX "Platform_longitude_idx" ON "Platform"("longitude");

-- CreateIndex
CREATE INDEX "Platform_latitude_longitude_idx" ON "Platform"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "PlatformsOnRoutes" ADD CONSTRAINT "PlatformsOnRoutes_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformsOnRoutes" ADD CONSTRAINT "PlatformsOnRoutes_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
