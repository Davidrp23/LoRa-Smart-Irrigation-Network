import { Module } from '@nestjs/common';
import { RoutersService } from './routers.service';
import { RoutersController } from './routers.controller';
import { AuthModule } from 'src/auth/auth.module';
import { ParcelasModule } from 'src/parcelas/parcelas.module';

@Module({
  imports: [AuthModule, ParcelasModule],
  controllers: [RoutersController],
  providers: [RoutersService],
  exports: [RoutersService],
})
export class RoutersModule {}
