/*
  Warnings:

  - A unique constraint covering the columns `[codigoVinculacion]` on the table `Mota` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[codigoVinculacion]` on the table `Router` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[apiToken]` on the table `Router` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `apiToken` to the `Router` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
CREATE SEQUENCE mota_id_seq;
ALTER TABLE "Mota" ALTER COLUMN "id" SET DEFAULT nextval('mota_id_seq');
ALTER SEQUENCE mota_id_seq OWNED BY "Mota"."id";

-- AlterTable
CREATE SEQUENCE router_id_seq;
ALTER TABLE "Router" ADD COLUMN     "apiToken" TEXT NOT NULL,
ALTER COLUMN "id" SET DEFAULT nextval('router_id_seq');
ALTER SEQUENCE router_id_seq OWNED BY "Router"."id";

-- CreateIndex
CREATE UNIQUE INDEX "Mota_codigoVinculacion_key" ON "Mota"("codigoVinculacion");

-- CreateIndex
CREATE UNIQUE INDEX "Router_codigoVinculacion_key" ON "Router"("codigoVinculacion");

-- CreateIndex
CREATE UNIQUE INDEX "Router_apiToken_key" ON "Router"("apiToken");
