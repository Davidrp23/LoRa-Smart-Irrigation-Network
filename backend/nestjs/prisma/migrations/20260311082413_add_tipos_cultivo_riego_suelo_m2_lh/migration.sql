/*
  Warnings:

  - You are about to drop the column `cultivo` on the `Parcela` table. All the data in the column will be lost.
  - You are about to drop the column `tipoSuelo` on the `Parcela` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Parcela" DROP COLUMN "cultivo",
DROP COLUMN "tipoSuelo",
ADD COLUMN     "areaM2" DOUBLE PRECISION,
ADD COLUMN     "caudalRiegoLh" DOUBLE PRECISION,
ADD COLUMN     "cultivoId" INTEGER,
ADD COLUMN     "riegoId" INTEGER,
ADD COLUMN     "sueloId" INTEGER;

-- CreateTable
CREATE TABLE "TipoSuelo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidadCampo" DOUBLE PRECISION NOT NULL,
    "puntoMarchitez" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TipoSuelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoCultivo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "kcBase" DOUBLE PRECISION NOT NULL,
    "humedadObjetivo" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TipoCultivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoRiego" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "eficiencia" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TipoRiego_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoSuelo_nombre_key" ON "TipoSuelo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoCultivo_nombre_key" ON "TipoCultivo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoRiego_nombre_key" ON "TipoRiego"("nombre");

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_sueloId_fkey" FOREIGN KEY ("sueloId") REFERENCES "TipoSuelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_cultivoId_fkey" FOREIGN KEY ("cultivoId") REFERENCES "TipoCultivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_riegoId_fkey" FOREIGN KEY ("riegoId") REFERENCES "TipoRiego"("id") ON DELETE SET NULL ON UPDATE CASCADE;
