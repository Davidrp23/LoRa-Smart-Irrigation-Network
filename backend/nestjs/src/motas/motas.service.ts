import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Medicion, Mota, PrismaPromise } from '@prisma/client';
import { vincularMotaDto } from './dto/vincular-mota.dto';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ParcelasService } from 'src/parcelas/parcelas.service';
import { randomBytes } from 'crypto';
import { UpdateMotasBulkDto } from './dto/update-motas-bulk.dto';
import { ObtenerMedicionDto } from './dto/obtener-medicion.dto';

@Injectable()
export class MotasService {

  private readonly logger = new Logger(MotasService.name);

  constructor(private prisma: PrismaService, private parcelasService: ParcelasService) { }


  async create(CreateMotaDto: CreateMotaDto): Promise<Mota> {
    let intentos: number = 0;

    // Solo comprobamos los intentos
    while (intentos < 3) {

      // 1. Pedimos 6 bytes en lugar de 4 (6 bytes = 12 caracteres hexadecimales)
      const rawCode = randomBytes(6).toString('hex').toUpperCase();

      // 2. Lo partimos en 3 bloques separados por guiones (Ej: "A1B2-C3D4-E5F6")
      const codigoVinculacion = `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}-${rawCode.slice(8, 12)}`;

      try {
        const nuevaMota = await this.prisma.mota.create({
          data: {
            ...CreateMotaDto,
            codigoVinculacion: codigoVinculacion,
          },
        });

        // ESCAPE 1: Si funciona, rompemos la función y salimos
        return nuevaMota;

      } catch (error: any) {
        if (error.code === 'P2002') {
          // ESCAPE 2: Vamos sumando hasta llegar a 3
          intentos++;
        } else {
          // ESCAPE 3: Error grave, abortamos misión
          throw error;
        }
      }
    }

    throw new InternalServerErrorException('No se pudo generar un código único para el router.');
  }

  async findAll(usuarioId: number): Promise<Mota[]> {
    return this.prisma.mota.findMany({
      where: { usuarioId },
      include: {
        mediciones: {
          select: { bateria: true, fecha: true }, // Necesitamos batería y fecha para la gráfica
          orderBy: { fecha: 'desc' },
          take: 10 // Últimas 10 mediciones de bateria para la grafica de presentacion
        },
        //Incluimos tambien el numero de la version pendiente para que el usuario pueda ver
        //en la interfaz si su mota tiene algun cambio pendiente
        configPendiente: {
          select: { version: true }
        }
      }
    });
  }

  async findOne(usuarioId: number, id: number): Promise<Mota | null> {
    return this.prisma.mota.findUnique({
      where: { id, usuarioId }
    });
  }

  async update(usuarioId: number, id: number, updateMotaDto: UpdateMotaDto): Promise<Mota> {

    //Tenemos que verificar si la parcela a la que se pretende vincular existe
    const parcelaId: number = updateMotaDto.parcelaId;

    if (parcelaId != null) {
      if (await this.parcelasService.findOne(usuarioId, parcelaId) == null) {
        throw new NotFoundException(`La parcela con ID ${parcelaId} no existe o no le pertenece al usuario propietario de la mota.`);
      }
    }

    //Tambien tenemos que verificar que el router exista, una mota puede estar conectada a un router que no 
    //sea propiedad del usuario

    const routerId: number = updateMotaDto.routerId;

    if (routerId != null) {
      if (await this.prisma.router.findUnique({ where: { id: routerId } }) == null) {
        throw new NotFoundException(`El router con ID ${routerId} no existe.`);
      }
    }

    // Verificamos si hay parámetros de configuración que tenga que aplicar la mota de forma física
    if (updateMotaDto.frecuencia !== undefined || updateMotaDto.conexionPublica !== undefined) {
      const currentConfig = await this.prisma.configuracionPendiente.findUnique({ where: { motaId: id } });
      const motaDb = await this.prisma.mota.findUnique({ where: { id }, select: { versionAplicada: true } });

      const newPayload = {
        ...(currentConfig ? (currentConfig.payload as object) : {}),
        ...(updateMotaDto.frecuencia !== undefined ? { f: updateMotaDto.frecuencia } : {}),
        ...(updateMotaDto.conexionPublica !== undefined ? { cP: updateMotaDto.conexionPublica } : {})
      };

      await this.prisma.configuracionPendiente.upsert({
        where: { motaId: id },
        create: {
          motaId: id,
          version: (motaDb?.versionAplicada || 0) + 1,
          payload: newPayload,
        },
        update: {
          version: (currentConfig?.version || 0) + 1,
          payload: newPayload,
        }
      });
    }

    return this.prisma.mota.update({
      where: { id, usuarioId },
      data: updateMotaDto
    });
  }

  async remove(usuarioId: number, id: number): Promise<Mota> {
    return this.prisma.mota.delete({
      where: { id, usuarioId }
    });
  }

  async vincularMota(Userid: number, vincularMotaDto: vincularMotaDto): Promise<Mota> {

    const { codigoVinculacion } = vincularMotaDto;

    //Buscar la mota
    const mota = await this.prisma.mota.findUnique({ where: { codigoVinculacion } });

    //Mota no existe
    if (!mota) {
      throw new NotFoundException(`Mota no encontrada.`);
    }

    //Evitar que alguien robe una mota ya vinculada
    if (mota.usuarioId !== null) {
      throw new ConflictException('Esta mota ya pertenece a otro usuario.');
    }

    //Conectar y Actualizar
    try {
      const motaActualizada: Mota = await this.prisma.mota.update({
        where: { codigoVinculacion },
        data: {
          usuario: {
            connect: { id: Userid }
          },
          // Insertar la fecha y hora actuales
          claimedAt: new Date(),
        },
      });

      return motaActualizada;

    } catch (error: any) {
      // Si Prisma intenta conectar a un usuario que no existe, lanza el error 'P2025'
      if (error.code === 'P2025') {
        throw new NotFoundException(`El usuario no existe.`);
      }
      // Si es otro error de base de datos, lo dejamos pasar
      throw error;
    }
  }

  async desvincularMota(usuarioId: number, id: number): Promise<Mota> {

    //Buscar la mota
    const mota = await this.prisma.mota.findUnique({ where: { id, usuarioId } });

    //Mota no existe
    if (!mota) {
      throw new NotFoundException(`La mota con ID ${id} no fue encontrada o no te pertenece.`);
    }

    //Conectar y Actualizar
    try {
      const motaActualizada: Mota = await this.prisma.mota.update({
        where: { id, usuarioId },
        data: {
          //Desemparejar usuario
          usuarioId: null,
          // Borrar fecha de adjudicacion
          claimedAt: null,
        },
      });

      return motaActualizada;

    } catch (error: any) {
      // Si Prisma intenta conectar a un usuario que no existe, lanza el error 'P2025'
      if (error.code === 'P2025') {
        throw new NotFoundException(`El usuario no existe.`);
      }
      // Si es otro error de base de datos, lo dejamos pasar
      throw error;
    }
  }

  async actualizarMotas(usuarioId: number, updateMotasBulkDto: UpdateMotasBulkDto) {

    const dataAActualizar: any = {};
    const shortPayload: any = {};

    if (updateMotasBulkDto.frecuencia !== undefined) {
      dataAActualizar.frecuencia = updateMotasBulkDto.frecuencia;
      shortPayload.f = updateMotasBulkDto.frecuencia;
    }

    if (updateMotasBulkDto.conexionPublica !== undefined) {
      dataAActualizar.conexionPublica = updateMotasBulkDto.conexionPublica;
      shortPayload.cP = updateMotasBulkDto.conexionPublica;
    }

    if (Object.keys(dataAActualizar).length === 0) {
      return { ok: true, mensaje: "Ningún dato modificado" };
    }

    const operaciones: PrismaPromise<any>[] = [];

    let motasID: number[] = Array.from(new Set(updateMotasBulkDto.motaIds));

    // Obtener las configuraciones pendientes actuales y la versión aplicada de las motas
    const configsActuales = await this.prisma.configuracionPendiente.findMany({
      where: { motaId: { in: motasID } }
    });
    const motasDb = await this.prisma.mota.findMany({
      where: { id: { in: motasID } },
      select: { id: true, versionAplicada: true }
    });

    for (const id of motasID) {
      operaciones.push(
        this.prisma.mota.update({
          where: { id, usuarioId },
          data: dataAActualizar,
        })
      );

      const currentConfig = configsActuales.find(c => c.motaId === id);
      const motaDb = motasDb.find(m => m.id === id);

      const newPayload = {
        ...(currentConfig ? (currentConfig.payload as object) : {}),
        ...shortPayload
      };

      operaciones.push(
        this.prisma.configuracionPendiente.upsert({
          where: { motaId: id },
          create: {
            motaId: id,
            version: (motaDb?.versionAplicada || 0) + 1,
            payload: newPayload
          },
          update: {
            version: (currentConfig?.version || 0) + 1,
            payload: newPayload
          }
        })
      );
    }

    try {
      const resultados = await this.prisma.$transaction(operaciones);
      this.logger.log(`BulkUpdate procesado con éxito. Motas actualizadas: ${operaciones.length}`);
      return { ok: true, motasActualizadas: operaciones.length };
    } catch (error) {
      this.logger.error(`Error crítico procesando la actualización de las motas:`, error);
      throw new InternalServerErrorException('Fallo al procesar el lote de actualización de las motas');
    }
  }

  async getReportes(usuarioId: number, obtenerMedicionDto: ObtenerMedicionDto): Promise<Medicion[] | null> {
    //Buscamos mediciones que se comprendan en las fechas y pertenezcan al usuario
    let motaId: number = obtenerMedicionDto.motaId;
    let fechaBegin: string = obtenerMedicionDto.fechaBegin;
    let fechaEnd: string = obtenerMedicionDto.fechaEnd

    //Nos aseguramos antes de buscar las mediciones si la mota pertenece al usuario.
    const mota = await this.prisma.mota.findUnique({ where: { id: motaId, usuarioId } });

    if (!mota) {
      throw new NotFoundException(`La mota con ID ${motaId} no existe o no te pertenece.`);
    }

    //Buscamos en la tabla de mediciones por id de la mota y teniendo en cuenta las dechas de inicio y fin
    return this.prisma.medicion.findMany({
      where: {
        motaId: motaId,
        fecha: {
          gte: new Date(fechaBegin), // Convertimos el string a objeto Date
          lte: new Date(fechaEnd)
        }
      }
    });
  }

}
