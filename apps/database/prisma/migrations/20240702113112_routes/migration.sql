-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StopsOnRoutes" (
    "stopId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StopsOnRoutes_pkey" PRIMARY KEY ("stopId","routeId")
);

-- CreateIndex
CREATE INDEX "Route_name_idx" ON "Route"("name");

-- CreateIndex
CREATE INDEX "Stop_name_idx" ON "Stop"("name");

-- CreateIndex
CREATE INDEX "Stop_latitude_idx" ON "Stop"("latitude");

-- CreateIndex
CREATE INDEX "Stop_longitude_idx" ON "Stop"("longitude");

-- CreateIndex
CREATE INDEX "Stop_latitude_longitude_idx" ON "Stop"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "StopsOnRoutes" ADD CONSTRAINT "StopsOnRoutes_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopsOnRoutes" ADD CONSTRAINT "StopsOnRoutes_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
