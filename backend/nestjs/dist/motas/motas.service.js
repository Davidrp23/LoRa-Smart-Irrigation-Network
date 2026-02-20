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
exports.MotasService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const common_2 = require("@nestjs/common");
let MotasService = class MotasService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createMotaDto) {
        return this.prisma.mota.create({
            data: createMotaDto
        });
    }
    async findAll() {
        return this.prisma.mota.findMany();
    }
    async findOne(id) {
        return this.prisma.mota.findUnique({
            where: { id }
        });
    }
    async update(id, updateMotaDto) {
        return this.prisma.mota.update({
            where: { id },
            data: updateMotaDto
        });
    }
    async remove(id) {
        return this.prisma.mota.delete({
            where: { id }
        });
    }
    async vincularMota(Userid, vincularMotaDto) {
        const { id, codigoVinculacion } = vincularMotaDto;
        const mota = await this.prisma.mota.findUnique({ where: { id } });
        if (!mota) {
            throw new common_2.NotFoundException(`La mota con ID ${id} no fue encontrada.`);
        }
        if (mota.usuarioId !== null) {
            throw new common_2.ConflictException('Esta mota ya pertenece a otro usuario.');
        }
        if (mota.codigoVinculacion !== codigoVinculacion) {
            throw new common_2.ForbiddenException('El código de vinculación es incorrecto.');
        }
        try {
            const motaActualizada = await this.prisma.mota.update({
                where: { id },
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
                throw new common_2.NotFoundException(`El usuario al que se pretende vincular no existe.`);
            }
            throw error;
        }
    }
};
exports.MotasService = MotasService;
exports.MotasService = MotasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MotasService);
//# sourceMappingURL=motas.service.js.map