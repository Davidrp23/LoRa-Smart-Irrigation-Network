import { Module } from '@nestjs/common';
import { MotasService } from './motas.service';
import { MotasController } from './motas.controller';

@Module({
  controllers: [MotasController],
  providers: [MotasService],
})
export class MotasModule {}
