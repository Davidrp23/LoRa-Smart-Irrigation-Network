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
const parcelas_service_1 = require("../parcelas/parcelas.service");
let RoutersService = class RoutersService {
    prisma;
    parcelasService;
    constructor(prisma, parcelasService) {
        this.prisma = prisma;
        this.parcelasService = parcelasService;
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
            where: { usuarioId },
            include: {
                reportes: {
                    select: { bateria: true, fecha: true },
                    orderBy: { fecha: 'desc' },
                    take: 10
                },
                configPendiente: {
                    select: { version: true }
                }
            }
        });
    }
    async findOne(usuarioId, id) {
        return this.prisma.router.findUnique({
            where: { id, usuarioId },
        });
    }
    async update(usuarioId, id, updateRouterDto) {
        if (updateRouterDto.parcelaId != null) {
            const parcela = await this.prisma.parcela.findUnique({ where: { id: updateRouterDto.parcelaId, usuarioId } });
            if (!parcela)
                throw new common_2.NotFoundException(`La parcela con ID ${updateRouterDto.parcelaId} no existe o no te pertenece.`);
        }
        const camposHardwareRouter = ['esPublico', 'canal', 'ssid'];
        const shortKeys = { esPublico: 'eP', canal: 'c', ssid: 's' };
        const hasHardwareChanges = camposHardwareRouter.some(key => updateRouterDto[key] !== undefined);
        if (hasHardwareChanges) {
            const currentConfig = await this.prisma.configuracionPendiente.findUnique({ where: { routerId: id } });
            const routerDb = await this.prisma.router.findUnique({ where: { id }, select: { versionAplicada: true } });
            const newPayload = {
                ...(currentConfig ? currentConfig.payload : {})
            };
            camposHardwareRouter.forEach(key => {
                const val = updateRouterDto[key];
                if (val !== undefined) {
                    newPayload[shortKeys[key]] = val;
                }
            });
            await this.prisma.configuracionPendiente.upsert({
                where: { routerId: id },
                create: {
                    routerId: id,
                    version: (routerDb?.versionAplicada || 0) + 1,
                    payload: newPayload,
                },
                update: {
                    version: (currentConfig?.version || 0) + 1,
                    payload: newPayload,
                }
            });
        }
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
    async isPublic(usuarioId = 0, apiToken = "", id) {
        let router = null;
        if (apiToken !== "") {
            router = await this.prisma.router.findUnique({
                where: { id, apiToken },
                select: { esPublico: true }
            });
        }
        else if (usuarioId !== 0) {
            router = await this.findOne(usuarioId, id);
        }
        if (!router) {
            throw new common_2.NotFoundException(`El router con ID ${id} no existe o no tienes permisos para verlo.`);
        }
        return router.esPublico ?? false;
    }
    async aceptarCliente(apiToken, motaId) {
        const router = await this.prisma.router.findUnique({
            where: { apiToken },
            select: { esPublico: true, usuarioId: true }
        });
        if (!router) {
            throw new common_2.NotFoundException(`El router no fue encontrado.`);
        }
        const mota = await this.prisma.mota.findUnique({
            where: { id: motaId },
            select: { usuarioId: true }
        });
        if (!mota) {
            throw new common_2.NotFoundException(`La mota no fue encontrada.`);
        }
        const esMismoDueno = (router.usuarioId !== null) && (router.usuarioId === mota.usuarioId);
        return (router.esPublico === true) || esMismoDueno;
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
    async getReportes(usuarioId, obtenerReportesDto) {
        let routerId = obtenerReportesDto.routerId;
        let fechaBegin = obtenerReportesDto.fechaBegin;
        let fechaEnd = obtenerReportesDto.fechaEnd;
        const router = await this.prisma.router.findUnique({ where: { id: routerId, usuarioId } });
        if (!router)
            throw new common_2.NotFoundException(`El router no existe o no te pertenece.`);
        return this.prisma.reporteRouter.findMany({
            where: { routerId,
                fecha: {
                    gte: new Date(fechaBegin),
                    lte: new Date(fechaEnd)
                }
            },
            orderBy: { fecha: 'asc' },
        });
    }
};
exports.RoutersService = RoutersService;
exports.RoutersService = RoutersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, parcelas_service_1.ParcelasService])
], RoutersService);
//# sourceMappingURL=routers.service.js.map