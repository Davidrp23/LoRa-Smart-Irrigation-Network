import { PrismaService } from '../prisma/prisma.service';
import { BigPacketDto } from './dto/big-packet.dto';
export declare class BigPacketService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(routerID: number, createBigPacketDto: BigPacketDto): Promise<{
        ok: boolean;
    }>;
}
