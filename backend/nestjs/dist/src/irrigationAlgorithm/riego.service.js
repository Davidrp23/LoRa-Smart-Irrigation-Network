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
    async calcularTurnosPendientes() {
        this.logger.log('Buscando turnos de riego pendientes de cálculo...');
        const turnos = await this.prisma.turnoRiego.findMany({
            where: {
                proximaEjecucionUTC: { lte: new Date() },
                parcela: {
                    fechaActualizacionHumedad: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
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
            if (!p.cultivo || !p.suelo || !p.areaM2 || !p.caudalRiegoLh)
                continue;
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.latitudCentro}&longitude=${p.longitudCentro}&daily=et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=${p.zonaHoraria}`;
                const res = await fetch(url);
                const clima = await res.json();
                const lluviaHoy = clima.daily.precipitation_sum[0] || 0;
                const et0Hoy = clima.daily.et0_fao_evapotranspiration[0] || 0;
                const humedadActual = p.humedadMedia || 0;
                const cc = p.suelo.capacidadCampo;
                const pm = p.suelo.puntoMarchitez;
                const porcentajeFaltante = Math.max(0, cc - humedadActual);
                const deficitSueloMm = (porcentajeFaltante / 100) * this.PROFUNDIDAD_RAICES_MM;
                const etc = et0Hoy * p.cultivo.kcBase;
                const necesidadNetaMm = deficitSueloMm + etc - lluviaHoy;
                const requiereRiego = humedadActual <= p.cultivo.humedadObjetivo || humedadActual <= (pm + 5);
                let tiempoMinutos = 0;
                let estado = 'Suelo Óptimo';
                let fechaRiegoExacta = null;
                if (necesidadNetaMm > 0 && requiereRiego) {
                    const eficiencia = p.riego?.eficiencia || 1;
                    const volumenRealLitros = (necesidadNetaMm * p.areaM2) / eficiencia;
                    const tiempoHoras = volumenRealLitros / p.caudalRiegoLh;
                    tiempoMinutos = Math.round(tiempoHoras * 60);
                    estado = 'Programado';
                    const [horas, minutos] = turno.horaConfigurada.split(':').map(Number);
                    fechaRiegoExacta = new Date();
                    fechaRiegoExacta.setHours(horas, minutos, 0, 0);
                }
                else if (necesidadNetaMm <= 0 && requiereRiego) {
                    estado = 'Pausado por Lluvia';
                }
                const nuevaProximaEjecucion = new Date(turno.proximaEjecucionUTC);
                nuevaProximaEjecucion.setDate(nuevaProximaEjecucion.getDate() + 1);
                await this.prisma.turnoRiego.update({
                    where: { id: turno.id },
                    data: {
                        estadoRiego: estado,
                        tiempoRiegoMin: tiempoMinutos,
                        proximoRiego: fechaRiegoExacta,
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RiegoService);
//# sourceMappingURL=riego.service.js.map