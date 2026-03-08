import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BigPacketDto } from './dto/big-packet.dto';
import { Prisma ,PrismaPromise } from '@prisma/client';

@Injectable()
export class BigPacketService {

  // Un Logger es más profesional que usar console.log()
  private readonly logger = new Logger(BigPacketService.name);

  constructor(private prisma: PrismaService) {}

  async create(routerID: number, createBigPacketDto: BigPacketDto) {
    // 1. Array donde guardaremos todas las "órdenes" para la base de datos
    const operaciones: PrismaPromise<any>[] = [];
    
    // Capturamos la hora exacta en la que llega el paquete
    const ahora = new Date();

    // ==========================================
    // 2. ACTUALIZAR EL ROUTER
    // ==========================================
    // Si el JSON incluía la parte "rt" (router), actualizamos sus sensores.
    // Si no, simplemente actualizamos su fecha de última conexión.
    const routerUpdateData = createBigPacketDto.router 
      ? { ...createBigPacketDto.router, fechaUltimaConexion: ahora }
      : { fechaUltimaConexion: ahora };

    operaciones.push(
      this.prisma.router.update({
        where: { id: routerID },
        data: routerUpdateData,
      })
    );

    // ==========================================
    // 3. PREPARAR LAS MOTAS Y SUS MEDICIONES
    // ==========================================
    // Prisma nos permite insertar cientos de registros de golpe con createMany
    const medicionesParaInsertar: Prisma.MedicionCreateManyInput[] = [];

    for (const mota of createBigPacketDto.motas) {
      
      // A) Actualizar el estado actual de la Mota (la "foto" del momento)
      operaciones.push(
        this.prisma.mota.update({
          where: { id: mota.motaId },
          data: {
            bateriaUltima: mota.bateria,
            // Truco Prisma: Si latitud/longitud vienen 'undefined', Prisma simplemente los ignora (no los borra).
            latitud: mota.latitud, 
            longitud: mota.longitud,
            routerId: routerID, // Enganchamos la mota al router que nos acaba de hablar
            fechaUltimaConexion: ahora,
            humedad: mota.humedad,
            rssi: mota.rssi,
            snr: mota.snr,
            erroresRxMota: mota.erroresRxMota,
          },
        })
      );

      // B) Preparar la medición histórica para el array
      medicionesParaInsertar.push({
        motaId: mota.motaId,
        // Si la mota manda timestamp (unix en segundos), lo usamos. Si no, usamos la hora actual.
        fecha: mota.timestamp ? new Date(mota.timestamp) : ahora,
        humedad: mota.humedad,
        bateria: mota.bateria,
        rssi: mota.rssi,
        snr: mota.snr,
        erroresRxMota: mota.erroresRxMota,
      });
    }

    // ==========================================
    // 4. AÑADIR EL INSERTADO MASIVO
    // ==========================================
    if (medicionesParaInsertar.length > 0) {
      operaciones.push(
        this.prisma.medicion.createMany({
          data: medicionesParaInsertar,
        })
      );
    }

    // ==========================================
    // 5. EJECUTAR LA TRANSACCIÓN (TODO O NADA)
    // ==========================================
    try {
      // Prisma ejecutará todas las promesas del array en estricto orden y de forma segura
      await this.prisma.$transaction(operaciones);
      
      this.logger.log(`BigPacket procesado con éxito. Router ID: ${routerID} | Motas actualizadas: ${createBigPacketDto.motas.length}`);
      
      // Devolvemos un mensaje diminuto para que el SIM800L se pueda ir a dormir rápido
      return { ok: true }; 

    } catch (error) {
      this.logger.error(`Error crítico procesando BigPacket del Router ${routerID}: ${error.message}`);
      // Lanzamos error 500 para que el router sepa que falló y lo vuelva a intentar más tarde
      throw new InternalServerErrorException('Fallo al procesar el lote de telemetría');
    }
  }
}