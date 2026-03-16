import { Module } from '@nestjs/common';
import { TurnoRiegoService } from './turno-riego.service';
import { TurnoRiegoController } from './turno-riego.controller';

@Module({
  controllers: [TurnoRiegoController],
  providers: [TurnoRiegoService],
})
export class TurnoRiegoModule {}
