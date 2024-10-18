/*
  Warnings:

  - The required column `id` was added to the `PlatformsOnRoutes` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('INFO', 'ERROR');

-- AlterTable
ALTER TABLE "PlatformsOnRoutes" ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "PlatformsOnRoutes_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Log" (
    "id" BIGSERIAL NOT NULL,
    "type" "LogType" NOT NULL,
    "message" TEXT NOT NULL,
    "trace" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);
