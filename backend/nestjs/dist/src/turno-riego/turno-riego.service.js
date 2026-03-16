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
exports.TurnoRiegoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TurnoRiegoService = class TurnoRiegoService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createTurnoRiegoDto) {
        await this.compruebaPermisos(userId, createTurnoRiegoDto.parcelaId);
        return this.prisma.turnoRiego.create({ data: createTurnoRiegoDto });
    }
    async findAll(userId, parcelaId) {
        await this.compruebaPermisos(userId, parcelaId);
        return this.prisma.turnoRiego.findMany({ where: { parcelaId } });
    }
    async findOne(userId, id) {
        await this.compruebaIdConParcela(userId, id);
        return this.prisma.turnoRiego.findUnique({ where: { id } });
    }
    async update(userId, id, updateTurnoRiegoDto) {
        await this.compruebaIdConParcela(userId, id);
        return this.prisma.turnoRiego.update({ where: { id }, data: updateTurnoRiegoDto });
    }
    async remove(userId, id) {
        await this.compruebaIdConParcela(userId, id);
        return this.prisma.turnoRiego.delete({ where: { id } });
    }
    async compruebaPermisos(userId, parcelaId) {
        const parcela = await this.prisma.parcela.findUnique({
            select: { id: true },
            where: {
                id: parcelaId,
                usuarioId: userId
            }
        });
        if (!parcela)
            throw new common_1.NotFoundException('Parcela no encontrada o no te pertenece.');
    }
    async compruebaIdConParcela(userId, id) {
        const turnoRiego = await this.prisma.turnoRiego.findUnique({
            select: { parcelaId: true },
            where: {
                id,
                parcela: {
                    usuarioId: userId
                }
            }
        });
        if (!turnoRiego)
            throw new common_1.NotFoundException('Turno de riego no encontrado o no te pertenece.');
    }
};
exports.TurnoRiegoService = TurnoRiegoService;
exports.TurnoRiegoService = TurnoRiegoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TurnoRiegoService);
//# sourceMappingURL=turno-riego.service.js.map