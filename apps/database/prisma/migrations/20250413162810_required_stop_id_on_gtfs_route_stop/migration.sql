/*
  Warnings:

  - Made the column `stopId` on table `GtfsRouteStop` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "GtfsRouteStop" DROP CONSTRAINT "GtfsRouteStop_stopId_fkey";

-- AlterTable
ALTER TABLE "GtfsRouteStop" ALTER COLUMN "stopId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "GtfsRouteStop" ADD CONSTRAINT "GtfsRouteStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
