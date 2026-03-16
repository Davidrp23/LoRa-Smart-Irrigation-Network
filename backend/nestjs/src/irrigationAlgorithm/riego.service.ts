import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RiegoService {
  private readonly logger = new Logger(RiegoService.name);
  private readonly PROFUNDIDAD_RAICES_MM = 300; 

  constructor(private prisma: PrismaService) {}

  // Se ejecuta en el minuto 0 de cada hora (Ej: 04:00, 05:00, 06:00...)
  @Cron(CronExpression.EVERY_HOUR)
  async calcularTurnosPendientes() {
    this.logger.log('Buscando turnos de riego pendientes de cálculo...');

    // 1. OBTENER SOLO LOS TURNOS CUYO "DESPERTADOR" YA SONÓ
    const turnos = await this.prisma.turnoRiego.findMany({
      where: {
        proximaEjecucionUTC: { lte: new Date() }, // lte = Menor o igual a AHORA
        parcela: {
          // Filtro de seguridad: ignorar si la mota lleva > 24h sin enviar datos
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
      if (!p.cultivo || !p.suelo || !p.areaM2 || !p.caudalRiegoLh) continue; 

      try {
        // 2. OBTENER CLIMA Y ESTADO REAL
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.latitudCentro}&longitude=${p.longitudCentro}&daily=et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=${p.zonaHoraria}`;
        const res = await fetch(url);
        const clima = await res.json(); 

        const lluviaHoy = clima.daily.precipitation_sum[0] || 0; 
        const et0Hoy = clima.daily.et0_fao_evapotranspiration[0] || 0; 
        
        const humedadActual = p.humedadMedia || 0; 
        const cc = p.suelo.capacidadCampo; 
        const pm = p.suelo.puntoMarchitez; 

        // 3. LA MATEMÁTICA (Evaluar necesidad EXACTA en este instante)
        const porcentajeFaltante = Math.max(0, cc - humedadActual); 
        const deficitSueloMm = (porcentajeFaltante / 100) * this.PROFUNDIDAD_RAICES_MM; 
        const etc = et0Hoy * p.cultivo.kcBase; 
        const necesidadNetaMm = deficitSueloMm + etc - lluviaHoy; 

        const requiereRiego = humedadActual <= p.cultivo.humedadObjetivo || humedadActual <= (pm + 5); 

        let tiempoMinutos = 0;
        let estado = 'Suelo Óptimo';
        let fechaRiegoExacta: Date | null = null;

        // 4. DECISIÓN DE RIEGO
        if (necesidadNetaMm > 0 && requiereRiego) { 
          const eficiencia = p.riego?.eficiencia || 1; 
          const volumenRealLitros = (necesidadNetaMm * p.areaM2) / eficiencia; 
          const tiempoHoras = volumenRealLitros / p.caudalRiegoLh; 
          tiempoMinutos = Math.round(tiempoHoras * 60); 
          estado = 'Programado';

          // Montar la hora exacta del riego para HOY usando la horaConfigurada (Ej: "06:00")
          const [horas, minutos] = turno.horaConfigurada.split(':').map(Number);
          fechaRiegoExacta = new Date(); 
          fechaRiegoExacta.setHours(horas, minutos, 0, 0); 
        } else if (necesidadNetaMm <= 0 && requiereRiego) {
          estado = 'Pausado por Lluvia';
        }

        // 5. REARMAR EL DESPERTADOR PARA MAÑANA
        // Sumamos 24 horas a la próxima ejecución actual para que se evalúe mañana
        const nuevaProximaEjecucion = new Date(turno.proximaEjecucionUTC as Date);
        nuevaProximaEjecucion.setDate(nuevaProximaEjecucion.getDate() + 1);

        // 6. GUARDAR TODO EN BASE DE DATOS
        await this.prisma.turnoRiego.update({
          where: { id: turno.id },
          data: {
            estadoRiego: estado,
            tiempoRiegoMin: tiempoMinutos, 
            proximoRiego: fechaRiegoExacta, 
            proximaEjecucionUTC: nuevaProximaEjecucion // Rearmado del gatillo
          }
        });

      } catch (error) {
        this.logger.error(`Error calculando turno ${turno.id}:`, error);
      }
    }
  }
}