import { PrismaService } from '../prisma/prisma.service';
export declare class ClimaServiceService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findOne(lat: number, long: number, timezone: string): Promise<any>;
}
