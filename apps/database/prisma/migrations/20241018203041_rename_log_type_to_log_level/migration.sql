/*
  Warnings:

  - You are about to drop the column `type` on the `Log` table. All the data in the column will be lost.
  - Added the required column `level` to the `Log` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('log', 'error', 'warn', 'debug', 'verbose', 'fatal');

-- AlterTable
ALTER TABLE "Log" DROP COLUMN "type",
ADD COLUMN     "level" "LogLevel" NOT NULL;

-- DropEnum
DROP TYPE "LogType";
