-- AlterTable
ALTER TABLE "Router" ADD COLUMN     "nombre" TEXT,
ADD COLUMN     "parcelaId" INTEGER;

-- AddForeignKey
ALTER TABLE "Router" ADD CONSTRAINT "Router_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "Parcela"("id") ON DELETE SET NULL ON UPDATE CASCADE;
