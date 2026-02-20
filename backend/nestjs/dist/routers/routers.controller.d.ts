import { RoutersService } from './routers.service';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { Router } from '@prisma/client';
import { VincularRouterDto } from './dto/vincular-router.dto';
export declare class RoutersController {
    private readonly routersService;
    constructor(routersService: RoutersService);
    create(createRouterDto: CreateRouterDto): Promise<Router>;
    vincularRouter(req: any, vincularRouterDto: VincularRouterDto): Promise<Router>;
    desvincularRouter(req: any, id: number): Promise<Router>;
    findAll(req: any): Promise<Router[]>;
    findOne(req: any, id: number): Promise<Router | null>;
    isPublic(req: any, id: number): Promise<Boolean | null>;
    update(req: any, id: number, updateRouterDto: UpdateRouterDto): Promise<Router>;
}
