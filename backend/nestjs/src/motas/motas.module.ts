import { Module } from '@nestjs/common';
import { MotasService } from './motas.service';
import { MotasController } from './motas.controller';
import { ParcelasModule } from 'src/parcelas/parcelas.module';
import { RoutersModule } from 'src/routers/routers.module';

@Module({
  imports: [ParcelasModule, RoutersModule],
  controllers: [MotasController],
  providers: [MotasService],
  exports: [MotasService],
})
export class MotasModule {}
