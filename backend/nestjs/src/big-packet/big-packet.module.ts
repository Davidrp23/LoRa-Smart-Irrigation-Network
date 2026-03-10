import { Module } from '@nestjs/common';
import { BigPacketService } from './big-packet.service';
import { BigPacketController } from './big-packet.controller';
import { ParcelasModule } from 'src/parcelas/parcelas.module';

@Module({
  imports: [ParcelasModule],
  controllers: [BigPacketController],
  providers: [BigPacketService],
})
export class BigPacketModule {}
