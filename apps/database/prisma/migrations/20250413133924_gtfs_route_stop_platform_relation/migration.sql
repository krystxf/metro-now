-- AlterTable
ALTER TABLE "GtfsRouteStop" ALTER COLUMN "stopId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "GtfsRouteStop" ADD CONSTRAINT "GtfsRouteStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;
