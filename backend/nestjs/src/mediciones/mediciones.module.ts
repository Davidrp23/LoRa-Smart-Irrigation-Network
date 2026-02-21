import { Module } from '@nestjs/common';
import { MedicionesService } from './mediciones.service';
import { MedicionesController } from './mediciones.controller';

@Module({
  controllers: [MedicionesController],
  providers: [MedicionesService],
  exports: [MedicionesService],
})
export class MedicionesModule {}
