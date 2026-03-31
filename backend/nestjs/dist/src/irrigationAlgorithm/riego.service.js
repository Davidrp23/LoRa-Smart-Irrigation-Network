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
const clima_service_service_1 = require("../clima-service/clima-service.service");
let RiegoService = RiegoService_1 = class RiegoService {
    prisma;
    climaService;
    logger = new common_1.Logger(RiegoService_1.name);
    PROFUNDIDAD_RAICES_MM = 300;
    HORAS_24_MS = 24 * 60 * 60 * 1000;
    HORAS_2_MS = 2 * 60 * 60 * 1000;
    constructor(prisma, climaService) {
        this.prisma = prisma;
        this.climaService = climaService;
    }
    async calcularTurnosPendientes() {
        this.logger.log('Buscando turnos de riego pendientes de cálculo...');
        const turnos = await this.prisma.turnoRiego.findMany({
            where: {
                OR: [
                    { proximaEjecucionUTC: null },
                    { proximaEjecucionUTC: { lte: new Date() } }
                ],
                parcela: {
                    fechaActualizacionHumedad: {
                        gte: new Date(Date.now() - this.HORAS_24_MS)
                    }
                }
            },
            include: {
                parcela: {
                    include: { cultivo: true, suelo: true, riego: true },
                },
            },
        });
        for (const turno of turnos) {
            const p = turno.parcela;
            if (!p.cultivo || !p.suelo || !p.areaM2 || !p.caudalRiegoLh) {
                this.logger.warn(`Saltando turno ${turno.id} para parcela ${p.id} por falta de datos agronómicos.`);
                continue;
            }
            try {
                const clima = await this.climaService.findOne(p.latitudCentro, p.longitudCentro, p.zonaHoraria || 'auto');
                if (!clima || !clima.daily) {
                    this.logger.error(`Respuesta inválida del servicio de clima para la parcela ${p.id}. Saltando turno.`);
                    continue;
                }
                const lluviaHoy = clima.daily.precipitation_sum[0] || 0;
                const et0Hoy = clima.daily.et0_fao_evapotranspiration[0] || 0;
                const humedadActual = p.humedadMedia || 0;
                const cc = p.suelo.capacidadCampo;
                const pm = p.suelo.puntoMarchitez;
                const porcentajeFaltante = Math.max(0, cc - humedadActual);
                const deficitSueloMm = (porcentajeFaltante / 100) * this.PROFUNDIDAD_RAICES_MM;
                const etc = et0Hoy * p.cultivo.kcBase;
                const necesidadNetaMm = deficitSueloMm + etc - lluviaHoy;
                const limiteDosisMm = p.laminaMaximaRiego || p.suelo.laminaMaximaRiego || Infinity;
                const laminaAAplicarMm = Math.min(necesidadNetaMm, limiteDosisMm);
                this.logger.debug(`Parcela ${p.id} | Necesidad Neta: ${necesidadNetaMm.toFixed(2)}mm | ` +
                    `Límite: ${limiteDosisMm}mm | Aplicando hoy: ${laminaAAplicarMm.toFixed(2)}mm`);
                const requiereRiego = humedadActual <= (p.humedadObjetivo || p.cultivo.humedadObjetivo) || humedadActual <= (pm + 5);
                let tiempoMinutos = 0;
                let estado = 'Suelo Óptimo';
                let proximoRiegoDate = null;
                if (laminaAAplicarMm > 0 && requiereRiego) {
                    const eficiencia = p.riego?.eficiencia || 1;
                    const volumenRealLitros = (laminaAAplicarMm * p.areaM2) / eficiencia;
                    const tiempoHoras = volumenRealLitros / p.caudalRiegoLh;
                    tiempoMinutos = Math.round(tiempoHoras * 60);
                    estado = 'Programado';
                    const getNextIrrigationTime = (horaConfigurada) => {
                        const [horas, minutos] = horaConfigurada.split(':').map(Number);
                        const proximoRiego = new Date();
                        proximoRiego.setHours(horas, minutos, 0, 0);
                        if (proximoRiego.getTime() < Date.now()) {
                            proximoRiego.setTime(proximoRiego.getTime() + this.HORAS_24_MS);
                        }
                        return proximoRiego;
                    };
                    proximoRiegoDate = getNextIrrigationTime(turno.horaConfigurada);
                }
                else if (laminaAAplicarMm <= 0 && requiereRiego) {
                    estado = 'Pausado por Lluvia';
                }
                const getNextExecutionTime = (horaConfigurada) => {
                    const [horas, minutos] = turno.horaConfigurada.split(':').map(Number);
                    const proximoRiegoBase = new Date();
                    proximoRiegoBase.setHours(horas, minutos, 0, 0);
                    const proximaEjecucion = new Date(proximoRiegoBase.getTime() - this.HORAS_2_MS);
                    if (proximaEjecucion.getTime() < Date.now()) {
                        proximaEjecucion.setTime(proximaEjecucion.getTime() + this.HORAS_24_MS);
                    }
                    return proximaEjecucion;
                };
                const nuevaProximaEjecucion = getNextExecutionTime(turno.horaConfigurada);
                await this.prisma.turnoRiego.update({
                    where: { id: turno.id },
                    data: {
                        estadoRiego: estado,
                        tiempoRiegoMin: tiempoMinutos,
                        proximoRiego: proximoRiegoDate,
                        proximaEjecucionUTC: nuevaProximaEjecucion
                    }
                });
            }
            catch (error) {
                this.logger.error(`Error calculando turno ${turno.id}:`, error);
            }
        }
    }
};
exports.RiegoService = RiegoService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RiegoService.prototype, "calcularTurnosPendientes", null);
exports.RiegoService = RiegoService = RiegoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        clima_service_service_1.ClimaServiceService])
], RiegoService);
//# sourceMappingURL=riego.service.js.map