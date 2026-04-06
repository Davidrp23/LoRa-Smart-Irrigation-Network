import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { Router, ReporteRouter } from '@prisma/client'; // 2. Importa el Tipo de Prisma (El Entity real)
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { VincularRouterDto } from './dto/vincular-router.dto';

import { randomBytes } from 'crypto';
import { ParcelasService } from 'src/parcelas/parcelas.service';
import { ObtenerReportesDto } from './dto/obtener-reportes.dto';

@Injectable()
export class RoutersService {

  // Inyecta Prisma en el constructor
  constructor(private prisma: PrismaService , private parcelasService: ParcelasService) {}


  async create(createRouterDto: CreateRouterDto): Promise<Router> {

    let intentos: number = 0;

    while (intentos < 3) {
      // 1. Generar el Token de la API (Para la máquina)
      // randomBytes(16) genera 16 bytes aleatorios, toString('hex') lo convierte a 32 caracteres (Ej: "8f4a2b9c...")
      const apiToken = randomBytes(16).toString('hex');

      // 2. Generar el Código de Vinculación (Para el humano)
      // 2.1. Pedimos 6 bytes en lugar de 4 (6 bytes = 12 caracteres hexadecimales)
      const rawCode = randomBytes(6).toString('hex').toUpperCase(); 
      
      // 2.2. Lo partimos en 3 bloques separados por guiones (Ej: "A1B2-C3D4-E5F6")
      const codigoVinculacion = `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}-${rawCode.slice(8, 12)}`;

      try {
        // 3. Intentamos insertar en la base de datos
        const nuevoRouter = await this.prisma.router.create({
          data: {
            ...createRouterDto, // Aquí viene el 'modelo' desde el DTO
            codigoVinculacion: codigoVinculacion,
            apiToken: apiToken,
          },
        });

        return nuevoRouter; // Si funciona, devuelve el router y sale de la función

      } catch (error: any) {
        // 4. Si falla porque el código o el token ya existen (Error P2002 de Prisma)
        if (error.code === 'P2002') {
          intentos++; // Sumamos un intento y el bucle while vuelve a empezar
        } else {
          // Si es otro error (ej. se ha caído la base de datos), que explote
          throw error;
        }
      }
    }

    // Si después de 3 intentos ha habido colisiones (prácticamente imposible), lanzamos error 500
    throw new InternalServerErrorException('No se pudo generar un código único para el router.');
  }

  async findAll(usuarioId: number): Promise<Router[]> {
    return this.prisma.router.findMany({
      where: { usuarioId },
      include: {
        reportes: {
          select: { bateria: true, fecha: true }, // Necesitamos batería y fecha para la gráfica
          orderBy: { fecha: 'desc' },
          take: 10 // Últimas 10 mediciones de bateria para la grafica de presentacion
        },
        //Incluimos tambien el numero de la version pendiente para que el usuario pueda ver
        //en la interfaz si su router tiene algun cambio pendiente
        configPendiente: {
          select: {version:true}
        }
      }
    });
  }

  async findOne(usuarioId: number, id: number): Promise<Router | null> {
    return this.prisma.router.findUnique({
      where: {id, usuarioId},
    });
  }

  async update(usuarioId: number, id: number, updateRouterDto: UpdateRouterDto): Promise<Router> {
    
    if(updateRouterDto.parcelaId != null){
      const parcela = await this.prisma.parcela.findUnique({where: {id: updateRouterDto.parcelaId, usuarioId}});
      if(!parcela) throw new NotFoundException(`La parcela con ID ${updateRouterDto.parcelaId} no existe o no te pertenece.`);
    }

    // Verificamos si hay parámetros de configuración físicos del router para Device Shadowing OTA
    const camposHardwareRouter: (keyof UpdateRouterDto)[] = ['esPublico', 'canal', 'ssid'];
    const shortKeys: Record<string, string> = { esPublico: 'eP', canal: 'c', ssid: 's' };
    const hasHardwareChanges = camposHardwareRouter.some(key => updateRouterDto[key as keyof UpdateRouterDto] !== undefined);

    if (hasHardwareChanges) {
      const currentConfig = await this.prisma.configuracionPendiente.findUnique({ where: { routerId: id } });
      const routerDb = await this.prisma.router.findUnique({ where: { id }, select: { versionAplicada: true } });
      
      const newPayload: any = {
        ...(currentConfig ? (currentConfig.payload as object) : {})
      };

      camposHardwareRouter.forEach(key => {
        const val = updateRouterDto[key as keyof UpdateRouterDto];
        if (val !== undefined) {
          newPayload[shortKeys[key]] = val;
        }
      });

      await this.prisma.configuracionPendiente.upsert({
        where: { routerId: id },
        create: {
          routerId: id,
          version: (routerDb?.versionAplicada || 0) + 1,
          payload: newPayload,
        },
        update: {
          version: (currentConfig?.version || 0) + 1,
          payload: newPayload,
        }
      });
    }

    return this.prisma.router.update({
      where: {id, usuarioId},
      data: updateRouterDto,
    });
  }

  async remove(id: number): Promise<Router> {
    return this.prisma.router.delete({
      where: {id},
    });
  }

  async isPublic(usuarioId: number = 0, apiToken: string = "", id: number): Promise<boolean> {
    
    let router: { esPublico: boolean | null } | null = null;

    if (apiToken !== "") {
      // Buscamos por token
      router = await this.prisma.router.findUnique({
        where: { id, apiToken },
        select: { esPublico: true } // Optimizado, mejor seleccionar la propiedad que todo el objeto
      });
    } else if (usuarioId !== 0) {
      //Probamos a buscar por usuario
      router = await this.findOne(usuarioId, id);
    }

    if (!router) {
      throw new NotFoundException(`El router con ID ${id} no existe o no tienes permisos para verlo.`);
    }

    // Devolvemos el valor. Si en la base de datos está a null, devolvemos false por seguridad.
    return router.esPublico ?? false;
  }

  async aceptarCliente(apiToken: string, motaId: number): Promise<boolean>{ 
    //Un router aceptara a un cliente si esta configurado como publico, o si esta como privado, lo aceptara 
    //si el usuario que posee la mota y el router es el mismo.

    // Buscamos el router 
    const router = await this.prisma.router.findUnique({
      where: { apiToken },
      select: { esPublico: true, usuarioId: true }
    });

    if (!router) {
      throw new NotFoundException(`El router no fue encontrado.`);
    }

    // Buscamos la mota
    const mota = await this.prisma.mota.findUnique({
      where: { id: motaId },
      select: { usuarioId: true }
    });

    if (!mota) {
      throw new NotFoundException(`La mota no fue encontrada.`);
    }

    // ¿Tienen el mismo dueño (y no es null)? --> ya que si ambos son null devuelve true
    const esMismoDueno = (router.usuarioId !== null) && (router.usuarioId === mota.usuarioId);
    
    // O es público, O tienen el mismo dueño.
    return (router.esPublico === true) || esMismoDueno;
  }

  async vincularRouter(Userid: number ,vincularRouterDto: VincularRouterDto): Promise<Router> {

    const {codigoVinculacion} = vincularRouterDto;

    //Buscar el router
    const router = await this.prisma.router.findUnique({ where: {codigoVinculacion} });

    //Router no existe
    if (!router) {
      throw new NotFoundException(`Router no encontrado.`);
    }

    //Evitar que alguien robe un router ya vinculado
    if (router.usuarioId !== null) {
      throw new ConflictException('Este router ya pertenece a otro usuario.');
    }

    //Conectar y Actualizar
    try {
      const routerActualizado: Router = await this.prisma.router.update({
        where: { codigoVinculacion },
        data: {
          usuario : {
            connect: {id: Userid}
          },
          // Insertar la fecha y hora actuales
          claimedAt: new Date(),
        },
      });

      return routerActualizado;

    } catch (error: any) {
      // Si Prisma intenta conectar a un usuario que no existe, lanza el error 'P2025'
      if (error.code === 'P2025') {
        throw new NotFoundException(`El usuario no existe.`);
      }
      // Si es otro error de base de datos, lo dejamos pasar
      throw error; 
    }
  }

  async desvincularRouter(Userid: number ,routerId: number): Promise<Router> {

    //Buscar el router
    const router = await this.prisma.router.findUnique({ where: {id: routerId, usuarioId: Userid} });

    //Router no existe
    if (!router) {
      throw new NotFoundException(`El router con ID ${routerId} no existe o no te pertenece.`);
    }

    //Conectar y Actualizar
    try {
      const routerActualizado: Router = await this.prisma.router.update({
        where: {id: routerId, usuarioId: Userid},
        data: {
          //Desenparejar del usuario
          usuarioId : null,
          // Borrar fecha
          claimedAt: null,
        },
      });

      return routerActualizado;

    } catch (error: any) {
      // Si Prisma intenta conectar a un usuario que no existe, lanza el error 'P2025'
      if (error.code === 'P2025') {
        throw new NotFoundException(`El usuario no existe.`);
      }
      // Si es otro error de base de datos, lo dejamos pasar
      throw error; 
    }
  }

  async getReportes(usuarioId: number, obtenerReportesDto: ObtenerReportesDto): Promise<ReporteRouter[]> {
    //Buscamos mediciones que se comprendan en las fechas y pertenezcan al usuario
    let routerId: number = obtenerReportesDto.routerId;
    let fechaBegin: string = obtenerReportesDto.fechaBegin;
    let fechaEnd: string = obtenerReportesDto.fechaEnd

    //Nos aseguramos antes de buscar las mediciones si la mota pertenece al usuario.
    const router = await this.prisma.router.findUnique({where: {id: routerId, usuarioId}});

    if (!router) throw new NotFoundException(`El router no existe o no te pertenece.`);

    return this.prisma.reporteRouter.findMany({
      where: { routerId,
        fecha: {
          gte: new Date(fechaBegin), // Convertimos el string a objeto Date
          lte: new Date(fechaEnd)
        }
       },
      orderBy: { fecha: 'asc' },
      
    });
  }
}
