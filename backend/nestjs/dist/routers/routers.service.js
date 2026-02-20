"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const common_2 = require("@nestjs/common");
let RoutersService = class RoutersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createRouterDto) {
        return this.prisma.router.create({
            data: createRouterDto
        });
    }
    async findAll() {
        return this.prisma.router.findMany();
    }
    async findOne(id) {
        return this.prisma.router.findUnique({
            where: { id },
        });
    }
    async update(id, updateRouterDto) {
        return this.prisma.router.update({
            where: { id },
            data: updateRouterDto,
        });
    }
    async remove(id) {
        return this.prisma.router.delete({
            where: { id },
        });
    }
    async isPublic(id) {
        const router = await this.findOne(id);
        if (!router) {
            throw new common_2.NotFoundException(`El router con ID ${id} no fue encontrado.`);
        }
        return router.esPublico;
    }
    async vincularRouter(Userid, vincularRouterDto) {
        const { id, codigoVinculacion } = vincularRouterDto;
        const router = await this.prisma.router.findUnique({ where: { id } });
        if (!router) {
            throw new common_2.NotFoundException(`El router con ID ${id} no fue encontrado.`);
        }
        if (router.usuarioId !== null) {
            throw new common_2.ConflictException('Este router ya pertenece a otro usuario.');
        }
        if (router.codigoVinculacion !== codigoVinculacion) {
            throw new common_2.ForbiddenException('El código de vinculación es incorrecto.');
        }
        try {
            const routerActualizado = await this.prisma.router.update({
                where: { id },
                data: {
                    usuario: {
                        connect: { id: Userid }
                    },
                    claimedAt: new Date(),
                },
            });
            return routerActualizado;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new common_2.NotFoundException(`El usuario al que se pretende vincular no existe.`);
            }
            throw error;
        }
    }
};
exports.RoutersService = RoutersService;
exports.RoutersService = RoutersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoutersService);
//# sourceMappingURL=routers.service.js.map