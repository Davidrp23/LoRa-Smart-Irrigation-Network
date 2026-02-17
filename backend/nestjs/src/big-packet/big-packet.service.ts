import { Injectable } from '@nestjs/common';
import { CreateBigPacketDto } from './dto/create-big-packet.dto';
import { UpdateBigPacketDto } from './dto/update-big-packet.dto';

@Injectable()
export class BigPacketService {
  create(createBigPacketDto: CreateBigPacketDto) {
    return 'This action adds a new bigPacket';
  }

  findAll() {
    return `This action returns all bigPacket`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bigPacket`;
  }

  update(id: number, updateBigPacketDto: UpdateBigPacketDto) {
    return `This action updates a #${id} bigPacket`;
  }

  remove(id: number) {
    return `This action removes a #${id} bigPacket`;
  }
}
