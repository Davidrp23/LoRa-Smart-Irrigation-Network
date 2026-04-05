import { BigPacketService } from './big-packet.service';
import { BigPacketDto } from './dto/big-packet.dto';
export declare class BigPacketController {
    private readonly bigPacketService;
    constructor(bigPacketService: BigPacketService);
    create(req: any, BigPacketDto: BigPacketDto): Promise<{
        ok: boolean;
        conf: any[];
    }>;
}
