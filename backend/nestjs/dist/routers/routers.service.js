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
const crypto_1 = require("crypto");
let RoutersService = class RoutersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createRouterDto) {
        let intentos = 0;
        while (intentos < 3) {
            const apiToken = (0, crypto_1.randomBytes)(16).toString('hex');
            const rawCode = (0, crypto_1.randomBytes)(6).toString('hex').toUpperCase();
            const codigoVinculacion = `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}-${rawCode.slice(8, 12)}`;
            try {
                const nuevoRouter = await this.prisma.router.create({
                    data: {
                        ...createRouterDto,
                        codigoVinculacion: codigoVinculacion,
                        apiToken: apiToken,
                    },
                });
                return nuevoRouter;
            }
            catch (error) {
                if (error.code === 'P2002') {
                    intentos++;
                }
                else {
                    throw error;
                }
            }
        }
        throw new common_1.InternalServerErrorException('No se pudo generar un código único para el router.');
    }
    async findAll(usuarioId) {
        return this.prisma.router.findMany({
            where: { usuarioId }
        });
    }
    async findOne(usuarioId, id) {
        return this.prisma.router.findUnique({
            where: { id, usuarioId },
        });
    }
    async update(usuarioId, id, updateRouterDto) {
        return this.prisma.router.update({
            where: { id, usuarioId },
            data: updateRouterDto,
        });
    }
    async remove(id) {
        return this.prisma.router.delete({
            where: { id },
        });
    }
    async isPublic(usuarioId, id) {
        const router = await this.findOne(usuarioId, id);
        if (!router) {
            throw new common_2.NotFoundException(`El router con ID ${id} no existe o no te pertenece.`);
        }
        return router.esPublico;
    }
    async vincularRouter(Userid, vincularRouterDto) {
        const { codigoVinculacion } = vincularRouterDto;
        const router = await this.prisma.router.findUnique({ where: { codigoVinculacion } });
        if (!router) {
            throw new common_2.NotFoundException(`Router no encontrado.`);
        }
        if (router.usuarioId !== null) {
            throw new common_2.ConflictException('Este router ya pertenece a otro usuario.');
        }
        try {
            const routerActualizado = await this.prisma.router.update({
                where: { codigoVinculacion },
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
                throw new common_2.NotFoundException(`El usuario no existe.`);
            }
            throw error;
        }
    }
    async desvincularRouter(Userid, routerId) {
        const router = await this.prisma.router.findUnique({ where: { id: routerId, usuarioId: Userid } });
        if (!router) {
            throw new common_2.NotFoundException(`El router con ID ${routerId} no existe o no te pertenece.`);
        }
        try {
            const routerActualizado = await this.prisma.router.update({
                where: { id: routerId, usuarioId: Userid },
                data: {
                    usuarioId: null,
                    claimedAt: null,
                },
            });
            return routerActualizado;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new common_2.NotFoundException(`El usuario no existe.`);
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