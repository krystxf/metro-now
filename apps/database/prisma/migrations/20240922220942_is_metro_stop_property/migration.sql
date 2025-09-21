/*
Warnings:

- Added the required column `isMetro` to the `Stop` table without a default value. This is not possible if the table is not empty.

 */
-- AlterTable
ALTER TABLE "Stop"
ADD COLUMN "isMetro" BOOLEAN NOT NULL;