-- CreateTable
CREATE TABLE "GtfsRoute" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "longName" TEXT,
    "url" TEXT,
    "color" TEXT,
    "isNight" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GtfsRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtfsRouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "stopSequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GtfsRouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GtfsRouteStop_routeId_directionId_stopId_stopSequence_key" ON "GtfsRouteStop"("routeId", "directionId", "stopId", "stopSequence");

-- AddForeignKey
ALTER TABLE "GtfsRouteStop" ADD CONSTRAINT "GtfsRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "GtfsRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
