-- DropForeignKey
ALTER TABLE "Parcela" DROP CONSTRAINT "Parcela_usuarioId_fkey";

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
