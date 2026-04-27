/*
  Warnings:

  - You are about to drop the column `erroresRxMota` on the `Medicion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Medicion" DROP COLUMN "erroresRxMota",
ADD COLUMN     "erroresCrc" INTEGER,
ADD COLUMN     "erroresRx" INTEGER,
ADD COLUMN     "erroresTx" INTEGER;
