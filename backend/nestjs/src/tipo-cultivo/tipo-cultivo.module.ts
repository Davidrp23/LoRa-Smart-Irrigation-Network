import { Module } from '@nestjs/common';
import { TipoCultivoService } from './tipo-cultivo.service';
import { TipoCultivoController } from './tipo-cultivo.controller';

@Module({
  controllers: [TipoCultivoController],
  providers: [TipoCultivoService],
})
export class TipoCultivoModule {}
