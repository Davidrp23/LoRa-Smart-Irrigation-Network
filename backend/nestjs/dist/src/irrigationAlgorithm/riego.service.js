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
var RiegoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiegoService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
let RiegoService = RiegoService_1 = class RiegoService {
    prisma;
    logger = new common_1.Logger(RiegoService_1.name);
    PROFUNDIDAD_RAICES_MM = 300;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calcularRiegoDiario() {
        this.logger.log('Iniciando cálculo del algoritmo FLoRa...');
        const parcelas = await this.prisma.parcela.findMany({
            include: { cultivo: true, suelo: true, riego: true },
        });
        for (const parcela of parcelas) {
            if (!parcela.cultivo || !parcela.suelo || !parcela.areaM2 || !parcela.caudalRiegoLh)
                continue;
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${parcela.latitudCentro}&longitude=${parcela.longitudCentro}&daily=et0_fao_evapotranspiration,precipitation_sum&timezone=Europe/Madrid`;
                const res = await fetch(url);
                const clima = await res.json();
                const lluviaHoy = clima.daily.precipitation_sum[0] || 0;
                const et0Hoy = clima.daily.et0_fao_evapotranspiration[0] || 0;
                const humedadActual = parcela.humedadMedia || 0;
                const cc = parcela.suelo.capacidadCampo;
                const pm = parcela.suelo.puntoMarchitez;
                const porcentajeFaltante = Math.max(0, cc - humedadActual);
                const deficitSueloMm = (porcentajeFaltante / 100) * this.PROFUNDIDAD_RAICES_MM;
                const etc = et0Hoy * parcela.cultivo.kcBase;
                const necesidadNetaMm = deficitSueloMm + etc - lluviaHoy;
                const requiereRiego = humedadActual <= parcela.cultivo.humedadObjetivo || humedadActual <= (pm + 5);
                if (necesidadNetaMm <= 0 || !requiereRiego) {
                    await this.prisma.parcela.update({
                        where: { id: parcela.id },
                        data: {
                            estadoRiego: necesidadNetaMm <= 0 ? 'Pausado por Lluvia' : 'Suelo Óptimo',
                            tiempoRiegoMin: 0,
                            proximoRiego: null
                        }
                    });
                    continue;
                }
                const eficiencia = parcela.riego?.eficiencia || 1;
                const volumenRealLitros = (necesidadNetaMm * parcela.areaM2) / eficiencia;
                const tiempoHoras = volumenRealLitros / parcela.caudalRiegoLh;
                const tiempoMinutos = Math.round(tiempoHoras * 60);
                const horaPreferida = "06:00";
                const [horas, minutos] = horaPreferida.split(':').map(Number);
                const fechaRiego = new Date();
                fechaRiego.setHours(horas, minutos, 0, 0);
                if (fechaRiego.getTime() < Date.now()) {
                    fechaRiego.setDate(fechaRiego.getDate() + 1);
                }
                await this.prisma.parcela.update({
                    where: { id: parcela.id },
                    data: {
                        estadoRiego: 'Programado',
                        tiempoRiegoMin: tiempoMinutos,
                        proximoRiego: fechaRiego
                    }
                });
            }
            catch (error) {
                this.logger.error(`Error calculando parcela ${parcela.id}:`, error);
            }
        }
    }
};
exports.RiegoService = RiegoService;
__decorate([
    (0, schedule_1.Cron)('0 1 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RiegoService.prototype, "calcularRiegoDiario", null);
exports.RiegoService = RiegoService = RiegoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RiegoService);
//# sourceMappingURL=riego.service.js.map