import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ClimaServiceService } from '../clima-service/clima-service.service';

@Injectable()
export class RiegoService {
  private readonly logger = new Logger(RiegoService.name);
  private readonly PROFUNDIDAD_RAICES_MM = 300; // Estimamos que las raices tienen 30cm de profundidad
  private readonly HORAS_24_MS = 24 * 60 * 60 * 1000;
  private readonly HORAS_2_MS = 2 * 60 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private climaService: ClimaServiceService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
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
        const clima = await this.climaService.findOne(
          p.latitudCentro,
          p.longitudCentro,
          p.zonaHoraria || 'auto',
        );

        if (!clima || !clima.daily) {
          this.logger.error(`Respuesta inválida del servicio de clima para la parcela ${p.id}. Saltando turno.`);
          continue;
        }

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
        
        // --- NUEVA LÓGICA: APLICACIÓN DEL LÍMITE DE RIEGO ---
        // 1. Buscamos el límite en la parcela. Si es null, buscamos en el catálogo de suelo.
        // Si ambos fallan (no debería pasar), usamos Infinity para no bloquear el riego.
        const limiteDosisMm = p.laminaMaximaRiego || p.suelo.laminaMaximaRiego || Infinity;
        
        // 2. Comparamos lo que falta vs lo que admite la tierra, y nos quedamos con el valor menor.
        const laminaAAplicarMm = Math.min(necesidadNetaMm, limiteDosisMm);

        this.logger.debug(
          `Parcela ${p.id} | Necesidad Neta: ${necesidadNetaMm.toFixed(2)}mm | ` +
          `Límite: ${limiteDosisMm}mm | Aplicando hoy: ${laminaAAplicarMm.toFixed(2)}mm`
        );

        const requiereRiego = humedadActual <= ((p as any).humedadObjetivo || p.cultivo.humedadObjetivo) || humedadActual <= (pm + 5); 

        let tiempoMinutos = 0;
        let estado = 'Suelo Óptimo';
        let proximoRiegoDate: Date | null = null; 

        // 4. DECISIÓN DE RIEGO
        // ATENCIÓN: Usamos 'laminaAAplicarMm' en lugar de 'necesidadNetaMm' para decidir y calcular
        if (laminaAAplicarMm > 0 && requiereRiego) { 
          const eficiencia = p.riego?.eficiencia || 1; 
          
          // Calculamos los litros basándonos en la lámina topeada
          const volumenRealLitros = (laminaAAplicarMm * p.areaM2) / eficiencia; 
          const tiempoHoras = volumenRealLitros / p.caudalRiegoLh; 
          tiempoMinutos = Math.round(tiempoHoras * 60); 
          estado = 'Programado';
          
          const getNextIrrigationTime = (horaConfigurada: string): Date => {
            const [horas, minutos] = horaConfigurada.split(':').map(Number);
            const proximoRiego = new Date();
            proximoRiego.setHours(horas, minutos, 0, 0);

            if (proximoRiego.getTime() < Date.now()) {
              proximoRiego.setTime(proximoRiego.getTime() + this.HORAS_24_MS);
            }
            return proximoRiego;
          };
          proximoRiegoDate = getNextIrrigationTime(turno.horaConfigurada);

        } else if (laminaAAplicarMm <= 0 && requiereRiego) {
          estado = 'Pausado por Lluvia';
        }

        // 5. REARMAR LA PRÓXIMA EJECUCIÓN
        const getNextExecutionTime = (horaConfigurada: string): Date => {
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

        // 6. GUARDAR TODO EN BASE DE DATOS
        await this.prisma.turnoRiego.update({
          where: { id: turno.id },
          data: {
            estadoRiego: estado,
            tiempoRiegoMin: tiempoMinutos, 
            proximoRiego: proximoRiegoDate, 
            proximaEjecucionUTC: nuevaProximaEjecucion 
          }
        });

      } catch (error) {
        this.logger.error(`Error calculando turno ${turno.id}:`, error);
      }
    }
  }
}