/*
  Warnings:

  - The primary key for the `PlatformsOnRoutes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `stopId` on the `PlatformsOnRoutes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[platformId,routeId]` on the table `PlatformsOnRoutes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `platformId` to the `PlatformsOnRoutes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PlatformsOnRoutes" DROP CONSTRAINT "PlatformsOnRoutes_stopId_fkey";

-- AlterTable
ALTER TABLE "PlatformsOnRoutes" DROP CONSTRAINT "PlatformsOnRoutes_pkey",
DROP COLUMN "stopId",
ADD COLUMN     "platformId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PlatformsOnRoutes_platformId_routeId_key" ON "PlatformsOnRoutes"("platformId", "routeId");

-- AddForeignKey
ALTER TABLE "PlatformsOnRoutes" ADD CONSTRAINT "PlatformsOnRoutes_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
