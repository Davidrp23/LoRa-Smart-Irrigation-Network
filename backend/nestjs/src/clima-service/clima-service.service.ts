import { Injectable, Logger } from '@nestjs/common';
import { CacheClima } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/*
ESTO ES UN SERVICIO PARA CACHEAR LAS RESPUESTAS DE LA API METEOROLOGICA: open-meteo.com

La idea es simple: 

Si un cliente o el algoritmo pide los datos meteorologicos para una parcela en una ubicacion
dada, y otro lo pide justamente despues, cerca o en la misma ubicacion, tenemos una segunda llamada a la API que es redundante.
Esto con miles de clientes puede generar demasiadas llamadas inncesarias a la API.

De momento la API es gratuita para usos no comerciales siendo estas sus condiciones:

===========
Non-Commercial Use
By using the Free API for non-commercial use you agree to following terms:

Less than 10'000 API calls per day, 5'000 per hour and 600 per minute.
You may only use the free API services for non-commercial purposes.
You accept to the CC-BY 4.0 licence, as specified in the licence conditions.
We reserve the right to block applications and IP addresses that misuse our service without prior notice.

Minutely Limit: 600 calls / min	
Hourly Limit: 5.000 calls / hour	
Daily Limit: 10.000 calls / day	
Monthly Limit: 300.000 calls / month
===========

Aunque para el alcance del TFG es mas que suficiente lo hago para constuir un sistema mas 
eficiente reduciendo los costes si en un futuro se cambia a otra API mas precisa 
pero con cobro por llamadas, asegurando la escalabilidad y la mantenibilidad del mismo.

Construiremos una tabla en la base de datos CacheClima, cuyos detalles y campos podemos verlos en schema.prisma.

Para hacer el calculo de usar los mismos datos si 2 o mas parcelas estan cerca no necesitamos complicarnos mucho:

La API de open-meteo trunca los decimales de la latitud y la longitud de una parcela cuando se le consulta, creando 
como una cuadricula virtual de unos 9 a 11 km cuadrados, entonces este calculo ya lo hace la API por nosotros, por ejemplo:

Si una parcela con su centro en lat:36.96983355900689 y long:-6.115642343055852 hace una peticion a la API pidiendo info 
meteorologica para su ubicacion la API devuelve:

{
  "latitude": 37, ---> REDONDEA
  "longitude": -6.125, ---> REDONDEA
  "generationtime_ms": 0.09119510650634766,
  "utc_offset_seconds": 3600,
  "timezone": "Europe/Madrid",
  "timezone_abbreviation": "GMT+1",
  "elevation": 1,
  "daily_units": {
  "time": "iso8601",
  [MAS DATOS...]
}

Haciendo que 2 parcelas cercanas tengan el mismo valor de localizacion para la API y por tanto los mismos datos.

Podemos hacer lo mismo y guardar los valores redondedos en nuestra tabla donde el ID será un 
string con este formato: "37_-6.125".

Cuando otro cliente pregunte por una ubicacion consultara nuestra API interna y esta redondeara la latitud y longitud
para despues construir el ID con el formato anterior visto y buscar si ya alguien pregunto por lo que necesita.
Si ademas no ha pasado demasiado tiempo <6h le procedemos a entregar el dato cacheado.
Nuestra API interna decide si coje el dato almacenado o consulta la API meteorologica.

Si no existe o es demasiado viejo creamos o reemplazamos el dato meteorologico en la BD.
*/

@Injectable()
export class ClimaServiceService {

  private readonly logger = new Logger(ClimaServiceService.name);

  constructor(private prisma: PrismaService) {}

  async findOne(lat: number, long: number, timezone: string) {
    const gridId: string = generarGridId(lat, long);
    const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;
    const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;

    const cachedClima = await this.prisma.cacheClima.findUnique({
      where: { gridId },
    });

    //No es null yademas tiene menos de 6h de antiguedad
    const esValido = cachedClima && (Date.now() - cachedClima.actualizado.getTime() < SEIS_HORAS_MS);

    if (esValido) {
      return cachedClima.datos;
    }

    // Si no hay caché o es vieja, consultamos Open-Meteo
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=${timezone}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error API externa: ${response.statusText}`);
      }

      const data = await response.json();

      // Guardar o actualizar en la BD
      await this.prisma.cacheClima.upsert({
        where: { gridId },
        update: {
          datos: data,
          actualizado: new Date(),
        },
        create: {
          gridId,
          datos: data,
        },
      });

      return data;
    } catch (error: any) {
      // Si falla la API pero tenemos datos viejos, los devolvemos como fallback, como maximo 3 dias de anatiguedad.
      this.logger.error(`Error obteniendo clima: ${error.message}`);
      if (cachedClima && Date.now() - cachedClima.actualizado.getTime() < TRES_DIAS_MS ){
        this.logger.warn(`Sirviendo datos de caché antiguos para ${gridId}`);
        return JSON.parse(cachedClima.datos as string);
      }
      throw error;
    }
  }
}

/*
  Redondea coordenadas para crear un ID de cuadrícula (Grid ID).
  Usamos 1 decimal (~11.1 km) para alinear nuestra caché con la resolución
  real de los modelos meteorológicos (ej. ECMWF de 9km).
  Asi todas las parcelas de una comarca o pueblo llamaran 1 vez a la API real, ahorrando muchas llamadas.
*/
function generarGridId(latitud: number, longitud: number, decimales: number = 1): string {
  const factor = Math.pow(10, decimales);
  
  const latRedondeada = Math.round((latitud + Number.EPSILON) * factor) / factor;
  const lonRedondeada = Math.round((longitud + Number.EPSILON) * factor) / factor;

  // Si pasas 37.3891 y -5.9812, devolverá "37.4_-6"
  return `${latRedondeada}_${lonRedondeada}`;
}
