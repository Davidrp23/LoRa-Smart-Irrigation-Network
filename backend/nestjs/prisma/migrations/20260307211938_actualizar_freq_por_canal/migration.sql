/*
  Warnings:

  - You are about to drop the column `frecuencia` on the `Router` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Router" DROP COLUMN "frecuencia",
ADD COLUMN     "canal" INTEGER;
