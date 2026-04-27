/*
  Warnings:

  - You are about to drop the column `canal` on the `Mota` table. All the data in the column will be lost.
  - You are about to drop the column `erroresRxMota` on the `Mota` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Medicion" ADD COLUMN     "erroresACKfaltante" INTEGER,
ADD COLUMN     "erroresCanalOcupado" INTEGER,
ADD COLUMN     "erroresCriptograficos" INTEGER;

-- AlterTable
ALTER TABLE "Mota" DROP COLUMN "canal",
DROP COLUMN "erroresRxMota",
ADD COLUMN     "erroresACKfaltante" INTEGER DEFAULT 0,
ADD COLUMN     "erroresCanalOcupado" INTEGER DEFAULT 0,
ADD COLUMN     "erroresCrc" INTEGER DEFAULT 0,
ADD COLUMN     "erroresCriptograficos" INTEGER DEFAULT 0,
ADD COLUMN     "erroresRx" INTEGER DEFAULT 0,
ADD COLUMN     "erroresTx" INTEGER DEFAULT 0,
ADD COLUMN     "paquetesEnviados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paquetesRecibidos" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ReporteRouter" ADD COLUMN     "cvgGPRS" INTEGER,
ADD COLUMN     "erroresCanalOcupado" INTEGER,
ADD COLUMN     "erroresColaLlena" INTEGER,
ADD COLUMN     "erroresCriptograficos" INTEGER;

-- AlterTable
ALTER TABLE "Router" ADD COLUMN     "cvgGPRS" INTEGER,
ADD COLUMN     "erroresCanalOcupado" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "erroresColaLlena" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "erroresCriptograficos" INTEGER NOT NULL DEFAULT 0;
