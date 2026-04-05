import { PrismaService } from '../prisma/prisma.service';
import { BigPacketDto } from './dto/big-packet.dto';
import { ParcelasService } from '../parcelas/parcelas.service';
export declare class BigPacketService {
    private prisma;
    private parcelasService;
    private readonly logger;
    constructor(prisma: PrismaService, parcelasService: ParcelasService);
    create(routerID: number, createBigPacketDto: BigPacketDto): Promise<{
        ok: boolean;
        conf: any[];
    }>;
}
