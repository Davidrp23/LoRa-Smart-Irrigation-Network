-- DropForeignKey
ALTER TABLE "Medicion" DROP CONSTRAINT "Medicion_motaId_fkey";

-- AlterTable
ALTER TABLE "Parcela" ADD COLUMN     "humedadMedia" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ReporteRouter" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bateria" INTEGER,
    "paquetesEnviados" INTEGER NOT NULL,
    "paquetesRecibidos" INTEGER NOT NULL,
    "erroresTx" INTEGER NOT NULL,
    "erroresRx" INTEGER NOT NULL,
    "erroresCrc" INTEGER NOT NULL,
    "routerId" INTEGER NOT NULL,

    CONSTRAINT "ReporteRouter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoParcela" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "humedadMedia" DOUBLE PRECISION NOT NULL,
    "parcelaId" INTEGER NOT NULL,

    CONSTRAINT "HistoricoParcela_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReporteRouter_fecha_idx" ON "ReporteRouter"("fecha");

-- CreateIndex
CREATE INDEX "ReporteRouter_routerId_idx" ON "ReporteRouter"("routerId");

-- CreateIndex
CREATE INDEX "HistoricoParcela_fecha_idx" ON "HistoricoParcela"("fecha");

-- CreateIndex
CREATE INDEX "HistoricoParcela_parcelaId_idx" ON "HistoricoParcela"("parcelaId");

-- CreateIndex
CREATE INDEX "Medicion_fecha_idx" ON "Medicion"("fecha");

-- CreateIndex
CREATE INDEX "Medicion_motaId_idx" ON "Medicion"("motaId");

-- AddForeignKey
ALTER TABLE "Medicion" ADD CONSTRAINT "Medicion_motaId_fkey" FOREIGN KEY ("motaId") REFERENCES "Mota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReporteRouter" ADD CONSTRAINT "ReporteRouter_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES "Router"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoParcela" ADD CONSTRAINT "HistoricoParcela_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "Parcela"("id") ON DELETE CASCADE ON UPDATE CASCADE;
