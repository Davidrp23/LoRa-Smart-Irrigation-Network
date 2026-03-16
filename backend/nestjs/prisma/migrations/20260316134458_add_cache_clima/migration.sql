-- CreateTable
CREATE TABLE "CacheClima" (
    "gridId" TEXT NOT NULL,
    "datos" JSONB NOT NULL,
    "actualizado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CacheClima_pkey" PRIMARY KEY ("gridId")
);
