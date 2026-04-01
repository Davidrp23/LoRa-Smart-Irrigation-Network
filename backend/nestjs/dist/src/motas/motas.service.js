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
var MotasService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotasService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const common_2 = require("@nestjs/common");
const parcelas_service_1 = require("../parcelas/parcelas.service");
const crypto_1 = require("crypto");
let MotasService = MotasService_1 = class MotasService {
    prisma;
    parcelasService;
    logger = new common_1.Logger(MotasService_1.name);
    constructor(prisma, parcelasService) {
        this.prisma = prisma;
        this.parcelasService = parcelasService;
    }
    async create(CreateMotaDto) {
        let intentos = 0;
        while (intentos < 3) {
            const rawCode = (0, crypto_1.randomBytes)(6).toString('hex').toUpperCase();
            const codigoVinculacion = `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}-${rawCode.slice(8, 12)}`;
            try {
                const nuevaMota = await this.prisma.mota.create({
                    data: {
                        ...CreateMotaDto,
                        codigoVinculacion: codigoVinculacion,
                    },
                });
                return nuevaMota;
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
        return this.prisma.mota.findMany({
            where: { usuarioId },
            include: {
                mediciones: {
                    select: { bateria: true, fecha: true },
                    orderBy: { fecha: 'desc' },
                    take: 24
                }
            }
        });
    }
    async findOne(usuarioId, id) {
        return this.prisma.mota.findUnique({
            where: { id, usuarioId }
        });
    }
    async update(usuarioId, id, updateMotaDto) {
        const parcelaId = updateMotaDto.parcelaId;
        if (parcelaId != null) {
            if (await this.parcelasService.findOne(usuarioId, parcelaId) == null) {
                throw new common_2.NotFoundException(`La parcela con ID ${parcelaId} no existe o no le pertenece al usuario propietario de la mota.`);
            }
        }
        const routerId = updateMotaDto.routerId;
        if (routerId != null) {
            if (await this.prisma.router.findUnique({ where: { id: routerId } }) == null) {
                throw new common_2.NotFoundException(`El router con ID ${routerId} no existe.`);
            }
        }
        return this.prisma.mota.update({
            where: { id, usuarioId },
            data: updateMotaDto
        });
    }
    async remove(usuarioId, id) {
        return this.prisma.mota.delete({
            where: { id, usuarioId }
        });
    }
    async vincularMota(Userid, vincularMotaDto) {
        const { codigoVinculacion } = vincularMotaDto;
        const mota = await this.prisma.mota.findUnique({ where: { codigoVinculacion } });
        if (!mota) {
            throw new common_2.NotFoundException(`Mota no encontrada.`);
        }
        if (mota.usuarioId !== null) {
            throw new common_2.ConflictException('Esta mota ya pertenece a otro usuario.');
        }
        try {
            const motaActualizada = await this.prisma.mota.update({
                where: { codigoVinculacion },
                data: {
                    usuario: {
                        connect: { id: Userid }
                    },
                    claimedAt: new Date(),
                },
            });
            return motaActualizada;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new common_2.NotFoundException(`El usuario no existe.`);
            }
            throw error;
        }
    }
    async desvincularMota(usuarioId, id) {
        const mota = await this.prisma.mota.findUnique({ where: { id, usuarioId } });
        if (!mota) {
            throw new common_2.NotFoundException(`La mota con ID ${id} no fue encontrada o no te pertenece.`);
        }
        try {
            const motaActualizada = await this.prisma.mota.update({
                where: { id, usuarioId },
                data: {
                    usuarioId: null,
                    claimedAt: null,
                },
            });
            return motaActualizada;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new common_2.NotFoundException(`El usuario no existe.`);
            }
            throw error;
        }
    }
    async actualizarMotas(usuarioId, updateMotasBulkDto) {
        const dataAActualizar = {};
        if (updateMotasBulkDto.frecuencia !== undefined) {
            dataAActualizar.frecuencia = updateMotasBulkDto.frecuencia;
        }
        if (updateMotasBulkDto.conexionPublica !== undefined) {
            dataAActualizar.conexionPublica = updateMotasBulkDto.conexionPublica;
        }
        if (Object.keys(dataAActualizar).length === 0) {
            return { ok: true, mensaje: "Ningún dato modificado" };
        }
        const operaciones = [];
        let motasID = Array.from(new Set(updateMotasBulkDto.motaIds));
        for (const id of motasID) {
            operaciones.push(this.prisma.mota.update({
                where: { id, usuarioId },
                data: dataAActualizar,
            }));
        }
        try {
            const resultados = await this.prisma.$transaction(operaciones);
            this.logger.log(`BulkUpdate procesado con éxito. Motas actualizadas: ${operaciones.length}`);
            return { ok: true, motasActualizadas: operaciones.length };
        }
        catch (error) {
            this.logger.error(`Error crítico procesando la actualización de las motas:`, error);
            throw new common_1.InternalServerErrorException('Fallo al procesar el lote de actualización de las motas');
        }
    }
};
exports.MotasService = MotasService;
exports.MotasService = MotasService = MotasService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, parcelas_service_1.ParcelasService])
], MotasService);
//# sourceMappingURL=motas.service.js.map