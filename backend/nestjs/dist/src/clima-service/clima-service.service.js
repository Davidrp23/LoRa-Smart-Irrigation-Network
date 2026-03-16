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
var ClimaServiceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClimaServiceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ClimaServiceService = ClimaServiceService_1 = class ClimaServiceService {
    prisma;
    logger = new common_1.Logger(ClimaServiceService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOne(lat, long, timezone) {
        const gridId = generarGridId(lat, long);
        const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;
        const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;
        const cachedClima = await this.prisma.cacheClima.findUnique({
            where: { gridId },
        });
        const esValido = cachedClima && (Date.now() - cachedClima.actualizado.getTime() < SEIS_HORAS_MS);
        if (esValido) {
            return cachedClima.datos;
        }
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=${timezone}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error API externa: ${response.statusText}`);
            }
            const data = await response.json();
            await this.prisma.cacheClima.upsert({
                where: { gridId },
                update: {
                    datos: data,
                    actualizado: new Date(),
                },
                create: {
                    gridId,
                    datos: data,
                },
            });
            return data;
        }
        catch (error) {
            this.logger.error(`Error obteniendo clima: ${error.message}`);
            if (cachedClima && Date.now() - cachedClima.actualizado.getTime() < TRES_DIAS_MS) {
                this.logger.warn(`Sirviendo datos de caché antiguos para ${gridId}`);
                return JSON.parse(cachedClima.datos);
            }
            throw error;
        }
    }
};
exports.ClimaServiceService = ClimaServiceService;
exports.ClimaServiceService = ClimaServiceService = ClimaServiceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClimaServiceService);
function generarGridId(latitud, longitud, decimales = 1) {
    const factor = Math.pow(10, decimales);
    const latRedondeada = Math.round((latitud + Number.EPSILON) * factor) / factor;
    const lonRedondeada = Math.round((longitud + Number.EPSILON) * factor) / factor;
    return `${latRedondeada}_${lonRedondeada}`;
}
//# sourceMappingURL=clima-service.service.js.map