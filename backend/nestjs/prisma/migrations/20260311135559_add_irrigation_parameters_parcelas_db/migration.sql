-- AlterTable
ALTER TABLE "Parcela" ADD COLUMN     "estadoRiego" TEXT,
ADD COLUMN     "proximoRiego" TIMESTAMP(3),
ADD COLUMN     "tiempoRiegoMin" INTEGER;
