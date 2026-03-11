import { Module } from '@nestjs/common';
import { TipoSueloService } from './tipo-suelo.service';
import { TipoSueloController } from './tipo-suelo.controller';

@Module({
  controllers: [TipoSueloController],
  providers: [TipoSueloService],
})
export class TipoSueloModule {}
