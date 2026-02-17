import { Module } from '@nestjs/common';
import { ParcelasService } from './parcelas.service';
import { ParcelasController } from './parcelas.controller';

@Module({
  controllers: [ParcelasController],
  providers: [ParcelasService],
})
export class ParcelasModule {}
