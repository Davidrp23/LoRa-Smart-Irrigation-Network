import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BigPacketDto } from './dto/big-packet.dto';
import { Prisma ,PrismaPromise } from '@prisma/client';
import { ParcelasService } from '../parcelas/parcelas.service';

@Injectable()
export class BigPacketService {

  // Un Logger es más profesional que usar console.log()
  private readonly logger = new Logger(BigPacketService.name);

  constructor(private prisma: PrismaService, private parcelasService: ParcelasService) {}

  async create(routerID: number, createBigPacketDto: BigPacketDto) {
    // 1. Array donde guardaremos todas las "órdenes" para la base de datos
    const operaciones: PrismaPromise<any>[] = [];
    
    // Capturamos la hora exacta en la que llega el paquete
    const ahora = new Date();

    //Sacamos el canal del router
    const router = await this.prisma.router.findUnique({
      where: { id: routerID },
      select: { canal: true },
    });
    const canal = router?.canal;


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
    // 2.1. CREAR REPORTE DE DIAGNÓSTICO (LOG)
    // ==========================================
    // Si el router envía datos de estado, guardamos un snapshot histórico
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
            canal: canal,
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
      const resultados = await this.prisma.$transaction(operaciones);
      
      this.logger.log(`BigPacket procesado con éxito. Router ID: ${routerID} | Motas actualizadas: ${createBigPacketDto.motas.length}`);
      
      // ==========================================
      // 6. RECALCULO REACTIVO DE PARCELAS
      // ==========================================
      // Identificamos qué parcelas se han visto afectadas por estos nuevos datos
      // para recalcular su humedad media inmediatamente.
      const parcelasAfectadas = new Set<number>();
      
      // Buscamos en los resultados de la transacción las motas actualizadas
      // (Saltamos el update del router y el reporte si existe)
      // Una forma más segura es iterar las motas del DTO y buscar su estado actual en BD, 
      // pero para eficiencia, asumimos que si la mota envió datos, su parcela debe actualizarse.
      // Como no tenemos el parcelaId en el DTO, lo consultamos rápidamente o lo inferimos.
      // Para simplificar y ser robustos: consultamos los IDs de parcela de las motas recibidas.
      const motasIds = createBigPacketDto.motas.map(m => m.motaId);
      const motasDb = await this.prisma.mota.findMany({ where: { id: { in: motasIds } }, select: { parcelaId: true } });
      
      motasDb.forEach(m => { if (m.parcelaId) parcelasAfectadas.add(m.parcelaId); });

      // Ejecutamos la actualización de agregados (fuera de la transacción principal para no bloquear)
      for (const parcelaId of parcelasAfectadas) {
        await this.parcelasService.actualizarEstadoParcela(parcelaId);
      }

      // Devolvemos un mensaje diminuto para que el SIM800L se pueda ir a dormir rápido
      return { ok: true }; 

    } catch (error) {
      this.logger.error(`Error crítico procesando BigPacket del Router ${routerID}: ${error.message}`);
      // Lanzamos error 500 para que el router sepa que falló y lo vuelva a intentar más tarde
      throw new InternalServerErrorException('Fallo al procesar el lote de telemetría');
    }
  }
}