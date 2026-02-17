// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() //  Hace que el servicio esté disponible en toda la app
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Exportamos el servicio para que otros lo usen
})
export class PrismaModule {}