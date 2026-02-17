-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Router" (
    "id" INTEGER NOT NULL,
    "modelo" TEXT,
    "ssid" TEXT,
    "esPublico" BOOLEAN NOT NULL DEFAULT false,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "bateria" INTEGER,
    "fechaUltimaConexion" TIMESTAMP(3),
    "paquetesEnviados" INTEGER NOT NULL DEFAULT 0,
    "paquetesRecibidos" INTEGER NOT NULL DEFAULT 0,
    "erroresTx" INTEGER NOT NULL DEFAULT 0,
    "erroresRx" INTEGER NOT NULL DEFAULT 0,
    "erroresCrc" INTEGER NOT NULL DEFAULT 0,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Router_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcela" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "cultivo" TEXT,
    "latitudCentro" DOUBLE PRECISION NOT NULL,
    "longitudCentro" DOUBLE PRECISION NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mota" (
    "id" INTEGER NOT NULL,
    "nombre" TEXT,
    "modelo" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "parcelaId" INTEGER,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "routerId" INTEGER,
    "bateriaUltima" INTEGER,
    "fechaUltimaConexion" TIMESTAMP(3),

    CONSTRAINT "Mota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicion" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "humedad" DOUBLE PRECISION NOT NULL,
    "tempSuelo" DOUBLE PRECISION,
    "bateria" INTEGER NOT NULL,
    "rssi" INTEGER,
    "snr" DOUBLE PRECISION,
    "erroresRxMota" INTEGER,
    "motaId" INTEGER NOT NULL,

    CONSTRAINT "Medicion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "Router" ADD CONSTRAINT "Router_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mota" ADD CONSTRAINT "Mota_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mota" ADD CONSTRAINT "Mota_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "Parcela"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mota" ADD CONSTRAINT "Mota_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES "Router"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicion" ADD CONSTRAINT "Medicion_motaId_fkey" FOREIGN KEY ("motaId") REFERENCES "Mota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
