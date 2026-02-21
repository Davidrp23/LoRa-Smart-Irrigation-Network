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
exports.MedicionesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const common_2 = require("@nestjs/common");
let MedicionesService = class MedicionesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createMedicionDto) {
        const mota = await this.prisma.mota.findUnique({ where: { id: createMedicionDto.motaId } });
        if (!mota) {
            throw new common_2.NotFoundException(`La mota con ID ${createMedicionDto.motaId} no existe.`);
        }
        return this.prisma.medicion.create({
            data: createMedicionDto
        });
    }
    findAll() {
        return this.prisma.medicion.findMany();
    }
    findOne(id) {
        return this.prisma.medicion.findUnique({
            where: { id }
        });
    }
    remove(id) {
        return this.prisma.medicion.delete({
            where: { id }
        });
    }
};
exports.MedicionesService = MedicionesService;
exports.MedicionesService = MedicionesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MedicionesService);
//# sourceMappingURL=mediciones.service.js.map