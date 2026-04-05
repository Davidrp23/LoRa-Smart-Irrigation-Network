-- AlterTable
ALTER TABLE "Mota" ADD COLUMN     "versionAplicada" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Router" ADD COLUMN     "versionAplicada" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ConfiguracionPendiente" (
    "id" SERIAL NOT NULL,
    "motaId" INTEGER,
    "routerId" INTEGER,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionPendiente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionPendiente_motaId_key" ON "ConfiguracionPendiente"("motaId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionPendiente_routerId_key" ON "ConfiguracionPendiente"("routerId");

-- AddForeignKey
ALTER TABLE "ConfiguracionPendiente" ADD CONSTRAINT "ConfiguracionPendiente_motaId_fkey" FOREIGN KEY ("motaId") REFERENCES "Mota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionPendiente" ADD CONSTRAINT "ConfiguracionPendiente_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES "Router"("id") ON DELETE CASCADE ON UPDATE CASCADE;
