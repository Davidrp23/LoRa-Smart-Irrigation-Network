import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BigPacketDto } from './dto/big-packet.dto';
import { Prisma, PrismaPromise } from '@prisma/client';
import { ParcelasService } from '../parcelas/parcelas.service';
import { TimeService } from '../time/time.service';

@Injectable()
export class BigPacketService {

  private readonly logger = new Logger(BigPacketService.name);

  constructor(
    private prisma: PrismaService,
    private parcelasService: ParcelasService,
    private timeService: TimeService,
  ) { }

  async create(routerID: number, createBigPacketDto: BigPacketDto) {
    // 1. Array donde guardaremos todas las "órdenes" para la base de datos
    const operaciones: PrismaPromise<any>[] = [];


    // ==========================================
    // 1.1 CALIBRACIÓN DEL RELOJ DEL ROUTER
    // ==========================================
    // El epoch Unix (segundos desde 1970-01-01 UTC) que se envía al router es
    // SIEMPRE UTC, independientemente de la zona horaria de la parcela.
    // Esto es correcto: Unix epoch ES UTC por definición. El mismo número
    // representa el mismo instante en todo el planeta.
    //
    // La zona horaria de la parcela solo se usa para formatear los logs del
    // backend (ver campo localFormatted), lo que facilita la depuración al
    // mostrar la hora local del dispositivo.
    //
    // En el frontend, los campos DateTime de la BD llegan como ISO 8601 UTC
    // (ej: "2026-05-05T17:00:00.000Z"). El navegador del usuario los convierte
    // automáticamente a su zona horaria local al usar toLocaleString() o
    // cualquier librería de fechas (luxon, date-fns, etc.).
    const routerWithParcela = await this.prisma.router.findUnique({
      where: { id: routerID },
      select: {
        parcela: { select: { zonaHoraria: true } },
      },
    });
    const zonaHoraria = routerWithParcela?.parcela?.zonaHoraria ?? null;

    // Hora actual del servidor expresada en la zona horaria de la parcela (para logs)
    // unixSeconds es UTC independientemente de la zona — es el mismo número siempre
    const serverTime = this.timeService.getTimeForZone(zonaHoraria);
    const ahora = new Date(serverTime.unixSeconds * 1000);

    this.logger.debug(
      `Router ${routerID} → zona parcela: "${serverTime.timezone}" | ` +
      `Hora local: ${serverTime.localFormatted} (${serverTime.utcOffset}) | ` +
      `Epoch UTC: ${serverTime.unixSeconds}`
    );

    const TIME_DRIFT_THRESHOLD_S = 300; // 5 minutos
    let timeCorrection: number | undefined;

    if (createBigPacketDto.router?.routerTimestamp) {
      const routerEpoch = createBigPacketDto.router.routerTimestamp;
      const drift = Math.abs(serverTime.unixSeconds - routerEpoch);

      if (drift > TIME_DRIFT_THRESHOLD_S) {
        timeCorrection = serverTime.unixSeconds;
        this.logger.warn(
          `Reloj del Router ${routerID} desfasado ${drift}s (${(drift / 60).toFixed(1)} min) ` +
          `respecto a ${serverTime.timezone}. Enviando corrección.`
        );
      } else {
        this.logger.debug(
          `Reloj del Router ${routerID} sincronizado (desfase: ${drift}s).`
        );
      }
    } else {
      // El router no envió timestamp → reloj no calibrado aún.
      // Enviamos la hora actual para que se calibre en su primer contacto.
      timeCorrection = serverTime.unixSeconds;
      this.logger.log(
        `Router ${routerID} sin reloj calibrado. Enviando hora inicial ` +
        `(zona: ${serverTime.timezone}).`
      );
    }



    // ==========================================
    // 1.5 LÓGICA DE ACTUALIZACIONES OTA (DEVICE SHADOWING)
    // ==========================================
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
    const conf: any[] = []; // Array que devolveremos con configuraciones a aplicar

    if (configRouter) {
      if (createBigPacketDto.router && createBigPacketDto.router.versionAplicada !== undefined && createBigPacketDto.router.versionAplicada === configRouter.version) {
        // El router ya aplicó la configuración deseada
        operaciones.push(
          this.prisma.configuracionPendiente.delete({ where: { id: configRouter.id } })
        );
      } else {
        // El router necesita actualizarse
        conf.push({
          tg: 'r', // target: router -> r
          id: routerID,
          v: configRouter.version, // version -> v
          p: configRouter.payload  // payload -> p
        });
      }
    }

    // ==========================================
    // 2. ACTUALIZAR EL ROUTER
    // ==========================================
    // Si el JSON incluía la parte "rt" (router), actualizamos sus sensores.
    // Si no, simplemente actualizamos su fecha de última conexión.
    //
    // NOTA: routerTimestamp se extrae del spread ({ routerTimestamp, ...rest })
    // porque es un campo exclusivo del DTO (solo se usa para calibración del reloj)
    // y NO existe como columna en la tabla Router del schema de Prisma.
    //
    // fechaUltimaConexion del router siempre usa la hora actual del servidor:
    // el router se comunica en tiempo real, por lo que "ahora" es correcto.
    // Las motas son diferentes — sus datos son diferidos y pueden tardar horas
    // en llegar, por eso usan su propio timestamp.
    let routerUpdateData: any = { fechaUltimaConexion: ahora };
    if (createBigPacketDto.router) {
      const { routerTimestamp, ...routerFields } = createBigPacketDto.router;
      routerUpdateData = { ...routerFields, fechaUltimaConexion: ahora };
    }

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
          cvgGPRS: createBigPacketDto.router.cvgGPRS,
          paquetesEnviados: createBigPacketDto.router.paquetesEnviados ?? 0,
          paquetesRecibidos: createBigPacketDto.router.paquetesRecibidos ?? 0,
          erroresTx: createBigPacketDto.router.erroresTx ?? 0,
          erroresRx: createBigPacketDto.router.erroresRx ?? 0,
          erroresCrc: createBigPacketDto.router.erroresCrc ?? 0,
          erroresCriptograficos: createBigPacketDto.router.erroresCriptograficos ?? 0,
          erroresCanalOcupado: createBigPacketDto.router.erroresCanalOcupado ?? 0,
          erroresColaLlena: createBigPacketDto.router.erroresColaLlena ?? 0,
        }
      }));
    }

    // ==========================================
    // 3. PREPARAR LAS MOTAS Y SUS MEDICIONES
    // ==========================================
    // Prisma nos permite insertar cientos de registros de golpe con createMany
    const medicionesParaInsertar: Prisma.MedicionCreateManyInput[] = [];

    // Pre-calcular la versión más alta de cada mota dentro de este big-packet.
    // Si una mota aparece varias veces (datos acumulados), nos quedamos con la
    // versionAplicada más grande para decidir si la config pendiente ya fue aplicada.
    const maxVersionPorMota = new Map<number, number>();
    for (const mota of createBigPacketDto.motas) {
      if (mota.versionAplicada !== undefined) {
        const actual = maxVersionPorMota.get(mota.motaId);
        if (actual === undefined || mota.versionAplicada > actual) {
          maxVersionPorMota.set(mota.motaId, mota.versionAplicada);
        }
      }
    }

    // Set para asegurar que la lógica OTA de cada mota solo se ejecuta una vez
    const motasOtaProcesadas = new Set<number>();

    for (const mota of createBigPacketDto.motas) {

      // Check Mota version para OTA — solo una vez por motaId, usando la versión más alta
      if (!motasOtaProcesadas.has(mota.motaId)) {
        motasOtaProcesadas.add(mota.motaId);

        const configMota = configsPendientes.find(c => c.motaId === mota.motaId);
        if (configMota) {
          const mejorVersion = maxVersionPorMota.get(mota.motaId);
          if (mejorVersion !== undefined && mejorVersion === configMota.version) {
            // La versión más reciente dentro del big-packet coincide con la config deseada → aplicada
            operaciones.push(
              this.prisma.configuracionPendiente.delete({ where: { id: configMota.id } })
            );
          } else {
            // Aún falta aplicarla en el hardware o falta un acuse de recibo de confirmación
            conf.push({
              tg: 'm', // target: mota -> m
              id: mota.motaId,
              v: configMota.version, // version -> v
              p: configMota.payload  // payload -> p
            });
          }
        }
      }

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
            // Usamos el timestamp del router (si lo envió) para reflejar cuándo se recogieron los datos realmente
            fechaUltimaConexion: mota.timestamp ? new Date(mota.timestamp * 1000) : ahora,
            humedad: mota.humedad,
            rssi: mota.rssi,
            snr: mota.snr,
            paquetesEnviados: mota.paquetesEnviados ?? 0,
            paquetesRecibidos: mota.paquetesRecibidos ?? 0,
            erroresRx: mota.erroresRx ?? 0,
            erroresTx: mota.erroresTx ?? 0,
            erroresCrc: mota.erroresCrc ?? 0,
            erroresCanalOcupado: mota.erroresCanalOcupado ?? 0,
            erroresCriptograficos: mota.erroresCriptograficos ?? 0,
            erroresACKfaltante: mota.erroresACKfaltante ?? 0,
            versionAplicada: mota.versionAplicada, // Se actualiza si viene en el JSON
          },
        })
      );

      // B) Preparar la medición histórica para el array
      medicionesParaInsertar.push({
        motaId: mota.motaId,
        // Si la mota manda timestamp (unix en segundos), lo convertimos a ms para Date(). Si no, usamos la hora actual.
        fecha: mota.timestamp ? new Date(mota.timestamp * 1000) : ahora,
        humedad: mota.humedad,
        bateria: mota.bateria,
        rssi: mota.rssi,
        snr: mota.snr,
        paquetesEnviados: mota.paquetesEnviados,
        paquetesRecibidos: mota.paquetesRecibidos,
        erroresRx: mota.erroresRx,
        erroresTx: mota.erroresTx,
        erroresCrc: mota.erroresCrc,
        erroresCriptograficos: mota.erroresCriptograficos,
        erroresCanalOcupado: mota.erroresCanalOcupado,
        erroresACKfaltante: mota.erroresACKfaltante,
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

      // Devolvemos la confirmación y la lista de configuraciones a aplicar en formato diminuto.
      // Si el reloj del router necesita calibración, incluimos "time" a nivel raíz
      // (fuera de conf[]) para que no se confunda con el flujo OTA de ConfiguracionPendiente.
      const response: any = { ok: true, conf };
      if (timeCorrection !== undefined) {
        response.time = timeCorrection;
      }
      return response;

    } catch (error: any) {
      this.logger.error(`Error crítico procesando BigPacket del Router ${routerID}: ${error.message}`);
      // Lanzamos error 500 para que el router sepa que falló y lo vuelva a intentar más tarde
      throw new InternalServerErrorException('Fallo al procesar el lote de telemetría');
    }
  }
}