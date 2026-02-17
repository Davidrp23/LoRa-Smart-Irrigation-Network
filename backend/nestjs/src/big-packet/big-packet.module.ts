import { Module } from '@nestjs/common';
import { BigPacketService } from './big-packet.service';
import { BigPacketController } from './big-packet.controller';

@Module({
  controllers: [BigPacketController],
  providers: [BigPacketService],
})
export class BigPacketModule {}
