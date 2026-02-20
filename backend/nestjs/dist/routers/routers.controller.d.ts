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
    findAll(): Promise<Router[]>;
    findOne(id: number): Promise<Router | null>;
    isPublic(id: number): Promise<Boolean | null>;
    update(id: number, updateRouterDto: UpdateRouterDto): Promise<Router>;
    remove(id: number): Promise<Router>;
}
