import { PartialType } from '@nestjs/swagger';
import { CreateBigPacketDto } from './create-big-packet.dto';

export class UpdateBigPacketDto extends PartialType(CreateBigPacketDto) {}
