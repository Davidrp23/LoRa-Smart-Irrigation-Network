import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MotasModule } from './motas/motas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RoutersModule } from './routers/routers.module';
import { ParcelasModule } from './parcelas/parcelas.module';
import { MedicionesModule } from './mediciones/mediciones.module';
import { BigPacketModule } from './big-packet/big-packet.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TipoCultivoModule } from './tipo-cultivo/tipo-cultivo.module';
import { TipoSueloModule } from './tipo-suelo/tipo-suelo.module';
import { TipoRiegoModule } from './tipo-riego/tipo-riego.module';

@Module({
  imports: [MotasModule, UsuariosModule, RoutersModule, ParcelasModule, MedicionesModule, BigPacketModule, PrismaModule, AuthModule, TipoCultivoModule, TipoSueloModule, TipoRiegoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
