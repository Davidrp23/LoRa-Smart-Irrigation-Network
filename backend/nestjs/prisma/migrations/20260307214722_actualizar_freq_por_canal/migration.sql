/*
  Warnings:

  - The `frecuencia` column on the `Mota` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Mota" DROP COLUMN "frecuencia",
ADD COLUMN     "frecuencia" INTEGER;
