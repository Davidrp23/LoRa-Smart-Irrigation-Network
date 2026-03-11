import { Module } from '@nestjs/common';
import { TipoRiegoService } from './tipo-riego.service';
import { TipoRiegoController } from './tipo-riego.controller';

@Module({
  controllers: [TipoRiegoController],
  providers: [TipoRiegoService],
})
export class TipoRiegoModule {}
