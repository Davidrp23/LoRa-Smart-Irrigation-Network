import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { Router } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VincularRouterDto } from './dto/vincular-router.dto';
export declare class RoutersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createRouterDto: CreateRouterDto): Promise<Router>;
    findAll(usuarioId: number): Promise<Router[]>;
    findOne(usuarioId: number, id: number): Promise<Router | null>;
    update(usuarioId: number, id: number, updateRouterDto: UpdateRouterDto): Promise<Router>;
    remove(id: number): Promise<Router>;
    isPublic(usuarioId: number, id: number): Promise<Boolean | null>;
    vincularRouter(Userid: number, vincularRouterDto: VincularRouterDto): Promise<Router>;
    desvincularRouter(Userid: number, routerId: number): Promise<Router>;
}
