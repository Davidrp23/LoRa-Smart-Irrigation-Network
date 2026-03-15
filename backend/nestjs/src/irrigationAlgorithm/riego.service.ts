import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RiegoService {
  private readonly logger = new Logger(RiegoService.name);
  
  // Constante agronómica: Asumimos 30 cm de profundidad de suelo a mojar
  private readonly PROFUNDIDAD_RAICES_MM = 300; 

  constructor(private prisma: PrismaService) {}

  @Cron('0 1 * * *') // Se ejecuta a la 01:00 AM
  async calcularRiegoDiario() {
    this.logger.log('Iniciando cálculo del algoritmo FLoRa...');

    const parcelas = await this.prisma.parcela.findMany({
      include: { cultivo: true, suelo: true, riego: true },
    });

    for (const parcela of parcelas) {
      if (!parcela.cultivo || !parcela.suelo || !parcela.areaM2 || !parcela.caudalRiegoLh) continue;

      try {
        // 1. Obtener clima (Open-Meteo) [cite: 9]
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${parcela.latitudCentro}&longitude=${parcela.longitudCentro}&daily=et0_fao_evapotranspiration,precipitation_sum&timezone=Europe/Madrid`;
        const res = await fetch(url);
        const clima = await res.json();

        const lluviaHoy = clima.daily.precipitation_sum[0] || 0;
        const et0Hoy = clima.daily.et0_fao_evapotranspiration[0] || 0;

        // 2. Estado actual del suelo (Datos de la Mota) 
        const humedadActual = parcela.humedadMedia || 0;
        const cc = parcela.suelo.capacidadCampo; // 
        const pm = parcela.suelo.puntoMarchitez; // [cite: 6]

        // 3. LA MATEMÁTICA REAL
        // ¿Cuánto porcentaje le falta para llenarse hasta la Capacidad de Campo?
        // Nota: Si la humedad actual es mayor que CC, el déficit es 0 (está encharcado)
        const porcentajeFaltante = Math.max(0, cc - humedadActual); 
        
        // Convertimos ese % a milímetros (Litros / m2)
        const deficitSueloMm = (porcentajeFaltante / 100) * this.PROFUNDIDAD_RAICES_MM;
        
        // Evapotranspiración del Cultivo (Lo que suda hoy)
        const etc = et0Hoy * parcela.cultivo.kcBase; // [cite: 7]
        
        // Necesidad Neta = Rellenar el suelo + Lo que se evapora hoy - Lo que llueve
        const necesidadNetaMm = deficitSueloMm + etc - lluviaHoy;

        // 4. DECISIÓN DE RIEGO
        // Regamos SI la humedad baja del objetivo, O SI está peligrosamente cerca de marchitarse
        const requiereRiego = humedadActual <= parcela.cultivo.humedadObjetivo || humedadActual <= (pm + 5); // [cite: 7]

        if (necesidadNetaMm <= 0 || !requiereRiego) {
          await this.prisma.parcela.update({
            where: { id: parcela.id },
            data: { 
              estadoRiego: necesidadNetaMm <= 0 ? 'Pausado por Lluvia' : 'Suelo Óptimo',
              tiempoRiegoMin: 0,
              proximoRiego: null
            }
          });
          continue;
        }

        // 5. CÁLCULO DE TIEMPO Y EFICIENCIA [cite: 3, 4]
        const eficiencia = parcela.riego?.eficiencia || 1;
        const volumenRealLitros = (necesidadNetaMm * parcela.areaM2) / eficiencia;
        const tiempoHoras = volumenRealLitros / parcela.caudalRiegoLh;
        const tiempoMinutos = Math.round(tiempoHoras * 60);

        // 6. PROGRAMAR LA HORA DINÁMICA
        const horaPreferida = "06:00";
        const [horas, minutos] = horaPreferida.split(':').map(Number);
        
        const fechaRiego = new Date();
        fechaRiego.setHours(horas, minutos, 0, 0);
        
        // Si la hora calculada ya pasó hoy (ej. son las 01:00 AM y el usuario puso las 00:30), lo pasamos a mañana
        if (fechaRiego.getTime() < Date.now()) {
            fechaRiego.setDate(fechaRiego.getDate() + 1);
        }

        await this.prisma.parcela.update({
          where: { id: parcela.id },
          data: {
            estadoRiego: 'Programado',
            tiempoRiegoMin: tiempoMinutos, // [cite: 12]
            proximoRiego: fechaRiego // [cite: 11]
          }
        });

      } catch (error) {
        this.logger.error(`Error calculando parcela ${parcela.id}:`, error);
      }
    }
  }
}