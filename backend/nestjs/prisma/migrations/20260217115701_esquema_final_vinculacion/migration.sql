/*
  Warnings:

  - Added the required column `codigoVinculacion` to the `Mota` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codigoVinculacion` to the `Router` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Mota" DROP CONSTRAINT "Mota_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Router" DROP CONSTRAINT "Router_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Mota" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "codigoVinculacion" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "usuarioId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Router" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "codigoVinculacion" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "usuarioId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Router" ADD CONSTRAINT "Router_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mota" ADD CONSTRAINT "Mota_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
