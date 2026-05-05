// time/time.service.ts
// Servicio para obtener la hora exacta según la zona horaria IANA de un dispositivo.
//
// Usa Luxon en lugar de Date() de JavaScript, que no maneja zonas horarias.
// La hora que se envía al router es el unix epoch en segundos (UTC),
// pero se deriva de la zona horaria de la parcela del router para poder
// registrar la hora local correcta en los logs y en la base de datos.

import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';

export interface DeviceTime {
  /** Unix epoch en segundos (UTC). Es lo que recibe el router para calibrar su reloj. */
  unixSeconds: number;
  /** ISO 8601 UTC, útil para logs del backend. */
  utcIso: string;
  /** Hora local formateada en la zona horaria de la parcela. Solo informativo. */
  localFormatted: string;
  /** Zona horaria IANA usada, ej: "Europe/Madrid". */
  timezone: string;
  /** Offset UTC de la zona, ej: "+02:00". */
  utcOffset: string;
}

@Injectable()
export class TimeService {
  private readonly logger = new Logger(TimeService.name);

  /**
   * Devuelve la hora actual del servidor convertida a la zona horaria dada.
   * El epoch Unix devuelto es siempre UTC, independiente de la zona horaria;
   * la zona solo se usa para formatear la hora local en logs.
   *
   * @param timezone Zona horaria IANA, ej: "Europe/Madrid", "America/Bogota".
   *                 Si es null/undefined/inválida, se usa "UTC" como fallback.
   */
  getTimeForZone(timezone: string | null | undefined): DeviceTime {
    const tz = timezone ?? 'UTC';

    const nowUtc = DateTime.utc();
    const localTime = nowUtc.setZone(tz);

    // Luxon devuelve un objeto con isValid = false si la zona es desconocida
    if (!localTime.isValid) {
      this.logger.warn(`Zona horaria inválida: "${tz}". Usando UTC como fallback.`);
      return this.getTimeForZone('UTC');
    }

    return {
      unixSeconds:   Math.floor(nowUtc.toMillis() / 1000),
      utcIso:        nowUtc.toISO()!,
      localFormatted: localTime.toFormat('yyyy-MM-dd HH:mm:ss'),
      timezone:       tz,
      utcOffset:      localTime.toFormat('ZZ'), // Ej: "+02:00"
    };
  }
}
