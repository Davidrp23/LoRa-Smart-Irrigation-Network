/*
  Warnings:

  - You are about to drop the column `estadoRiego` on the `Parcela` table. All the data in the column will be lost.
  - You are about to drop the column `proximoRiego` on the `Parcela` table. All the data in the column will be lost.
  - You are about to drop the column `tiempoRiegoMin` on the `Parcela` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Parcela" DROP COLUMN "estadoRiego",
DROP COLUMN "proximoRiego",
DROP COLUMN "tiempoRiegoMin",
ADD COLUMN     "fechaActualizacionHumedad" TIMESTAMP(3),
ADD COLUMN     "zonaHoraria" TEXT DEFAULT 'Europe/Madrid';

-- CreateTable
CREATE TABLE "TurnoRiego" (
    "id" SERIAL NOT NULL,
    "horaConfigurada" TEXT NOT NULL,
    "proximoRiego" TIMESTAMP(3),
    "tiempoRiegoMin" INTEGER,
    "estadoRiego" TEXT,
    "proximaEjecucionUTC" TIMESTAMP(3),
    "parcelaId" INTEGER NOT NULL,

    CONSTRAINT "TurnoRiego_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TurnoRiego" ADD CONSTRAINT "TurnoRiego_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "Parcela"("id") ON DELETE CASCADE ON UPDATE CASCADE;
