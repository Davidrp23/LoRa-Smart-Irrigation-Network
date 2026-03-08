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
let BigPacketService = BigPacketService_1 = class BigPacketService {
    prisma;
    logger = new common_1.Logger(BigPacketService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(routerID, createBigPacketDto) {
        const operaciones = [];
        const ahora = new Date();
        const routerUpdateData = createBigPacketDto.router
            ? { ...createBigPacketDto.router, fechaUltimaConexion: ahora }
            : { fechaUltimaConexion: ahora };
        operaciones.push(this.prisma.router.update({
            where: { id: routerID },
            data: routerUpdateData,
        }));
        const medicionesParaInsertar = [];
        for (const mota of createBigPacketDto.motas) {
            operaciones.push(this.prisma.mota.update({
                where: { id: mota.motaId },
                data: {
                    bateriaUltima: mota.bateria,
                    latitud: mota.latitud,
                    longitud: mota.longitud,
                    routerId: routerID,
                    fechaUltimaConexion: ahora,
                    humedad: mota.humedad,
                    rssi: mota.rssi,
                    snr: mota.snr,
                    erroresRxMota: mota.erroresRxMota,
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
            await this.prisma.$transaction(operaciones);
            this.logger.log(`BigPacket procesado con éxito. Router ID: ${routerID} | Motas actualizadas: ${createBigPacketDto.motas.length}`);
            return { ok: true };
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BigPacketService);
//# sourceMappingURL=big-packet.service.js.map