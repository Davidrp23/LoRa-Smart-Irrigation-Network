import { BigPacketService } from './big-packet.service';
import { CreateBigPacketDto } from './dto/create-big-packet.dto';
import { UpdateBigPacketDto } from './dto/update-big-packet.dto';
export declare class BigPacketController {
    private readonly bigPacketService;
    constructor(bigPacketService: BigPacketService);
    create(createBigPacketDto: CreateBigPacketDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateBigPacketDto: UpdateBigPacketDto): string;
    remove(id: string): string;
}
