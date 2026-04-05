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
var BigPacketService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigPacketService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const parcelas_service_1 = require("../parcelas/parcelas.service");
let BigPacketService = BigPacketService_1 = class BigPacketService {
    prisma;
    parcelasService;
    logger = new common_1.Logger(BigPacketService_1.name);
    constructor(prisma, parcelasService) {
        this.prisma = prisma;
        this.parcelasService = parcelasService;
    }
    async create(routerID, createBigPacketDto) {
        const operaciones = [];
        const ahora = new Date();
        const router = await this.prisma.router.findUnique({
            where: { id: routerID },
            select: { canal: true },
        });
        const canal = router?.canal;
        const motasIds = createBigPacketDto.motas.map(m => m.motaId);
        const configsPendientes = await this.prisma.configuracionPendiente.findMany({
            where: {
                OR: [
                    { routerId: routerID },
                    { motaId: { in: motasIds } }
                ]
            }
        });
        const configRouter = configsPendientes.find(c => c.routerId === routerID);
        const conf = [];
        if (configRouter) {
            if (createBigPacketDto.router && createBigPacketDto.router.versionAplicada !== undefined && createBigPacketDto.router.versionAplicada === configRouter.version) {
                operaciones.push(this.prisma.configuracionPendiente.delete({ where: { id: configRouter.id } }));
            }
            else {
                conf.push({
                    tg: 'r',
                    id: routerID,
                    v: configRouter.version,
                    p: configRouter.payload
                });
            }
        }
        const routerUpdateData = createBigPacketDto.router
            ? { ...createBigPacketDto.router, fechaUltimaConexion: ahora }
            : { fechaUltimaConexion: ahora };
        operaciones.push(this.prisma.router.update({
            where: { id: routerID },
            data: routerUpdateData,
        }));
        if (createBigPacketDto.router) {
            operaciones.push(this.prisma.reporteRouter.create({
                data: {
                    routerId: routerID,
                    bateria: createBigPacketDto.router.bateria,
                    paquetesEnviados: createBigPacketDto.router.paquetesEnviados ?? 0,
                    paquetesRecibidos: createBigPacketDto.router.paquetesRecibidos ?? 0,
                    erroresTx: createBigPacketDto.router.erroresTx ?? 0,
                    erroresRx: createBigPacketDto.router.erroresRx ?? 0,
                    erroresCrc: createBigPacketDto.router.erroresCrc ?? 0,
                }
            }));
        }
        const medicionesParaInsertar = [];
        for (const mota of createBigPacketDto.motas) {
            const configMota = configsPendientes.find(c => c.motaId === mota.motaId);
            if (configMota) {
                if (mota.versionAplicada !== undefined && mota.versionAplicada === configMota.version) {
                    operaciones.push(this.prisma.configuracionPendiente.delete({ where: { id: configMota.id } }));
                }
                else {
                    conf.push({
                        tg: 'm',
                        id: mota.motaId,
                        v: configMota.version,
                        p: configMota.payload
                    });
                }
            }
            operaciones.push(this.prisma.mota.update({
                where: { id: mota.motaId },
                data: {
                    bateriaUltima: mota.bateria,
                    latitud: mota.latitud,
                    longitud: mota.longitud,
                    routerId: routerID,
                    fechaUltimaConexion: ahora,
                    humedad: mota.humedad,
                    canal: canal,
                    rssi: mota.rssi,
                    snr: mota.snr,
                    erroresRxMota: mota.erroresRxMota,
                    versionAplicada: mota.versionAplicada,
                },
            }));
            medicionesParaInsertar.push({
                motaId: mota.motaId,
                fecha: mota.timestamp ? new Date(mota.timestamp) : ahora,
                humedad: mota.humedad,
                bateria: mota.bateria,
                rssi: mota.rssi,
                snr: mota.snr,
                erroresRxMota: mota.erroresRxMota,
            });
        }
        if (medicionesParaInsertar.length > 0) {
            operaciones.push(this.prisma.medicion.createMany({
                data: medicionesParaInsertar,
            }));
        }
        try {
            const resultados = await this.prisma.$transaction(operaciones);
            this.logger.log(`BigPacket procesado con éxito. Router ID: ${routerID} | Motas actualizadas: ${createBigPacketDto.motas.length}`);
            const parcelasAfectadas = new Set();
            const motasIds = createBigPacketDto.motas.map(m => m.motaId);
            const motasDb = await this.prisma.mota.findMany({ where: { id: { in: motasIds } }, select: { parcelaId: true } });
            motasDb.forEach(m => { if (m.parcelaId)
                parcelasAfectadas.add(m.parcelaId); });
            for (const parcelaId of parcelasAfectadas) {
                await this.parcelasService.actualizarEstadoParcela(parcelaId);
            }
            return { ok: true, conf };
        }
        catch (error) {
            this.logger.error(`Error crítico procesando BigPacket del Router ${routerID}: ${error.message}`);
            throw new common_1.InternalServerErrorException('Fallo al procesar el lote de telemetría');
        }
    }
};
exports.BigPacketService = BigPacketService;
exports.BigPacketService = BigPacketService = BigPacketService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, parcelas_service_1.ParcelasService])
], BigPacketService);
//# sourceMappingURL=big-packet.service.js.map