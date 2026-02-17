import { CreateBigPacketDto } from './dto/create-big-packet.dto';
import { UpdateBigPacketDto } from './dto/update-big-packet.dto';
export declare class BigPacketService {
    create(createBigPacketDto: CreateBigPacketDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateBigPacketDto: UpdateBigPacketDto): string;
    remove(id: number): string;
}
