/*
  Warnings:

  - Made the column `puntos` on table `Parcela` required. This step will fail if there are existing NULL values in that column.
  - Made the column `areaM2` on table `Parcela` required. This step will fail if there are existing NULL values in that column.
  - Made the column `caudalRiegoLh` on table `Parcela` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cultivoId` on table `Parcela` required. This step will fail if there are existing NULL values in that column.
  - Made the column `riegoId` on table `Parcela` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sueloId` on table `Parcela` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Parcela" ADD COLUMN     "laminaMaximaRiego" DOUBLE PRECISION,
ALTER COLUMN "puntos" SET NOT NULL,
ALTER COLUMN "areaM2" SET NOT NULL,
ALTER COLUMN "caudalRiegoLh" SET NOT NULL,
ALTER COLUMN "cultivoId" SET NOT NULL,
ALTER COLUMN "riegoId" SET NOT NULL,
ALTER COLUMN "sueloId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TipoSuelo" ADD COLUMN     "laminaMaximaRiego" DOUBLE PRECISION;
