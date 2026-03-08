import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { Router } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VincularRouterDto } from './dto/vincular-router.dto';
import { ParcelasService } from 'src/parcelas/parcelas.service';
export declare class RoutersService {
    private prisma;
    private parcelasService;
    constructor(prisma: PrismaService, parcelasService: ParcelasService);
    create(createRouterDto: CreateRouterDto): Promise<Router>;
    findAll(usuarioId: number): Promise<Router[]>;
    findOne(usuarioId: number, id: number): Promise<Router | null>;
    update(usuarioId: number, id: number, updateRouterDto: UpdateRouterDto): Promise<Router>;
    remove(id: number): Promise<Router>;
    isPublic(usuarioId: number | undefined, apiToken: string | undefined, id: number): Promise<boolean>;
    aceptarCliente(apiToken: string, motaId: number): Promise<boolean>;
    vincularRouter(Userid: number, vincularRouterDto: VincularRouterDto): Promise<Router>;
    desvincularRouter(Userid: number, routerId: number): Promise<Router>;
}
