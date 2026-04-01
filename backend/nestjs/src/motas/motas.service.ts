import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Mota, PrismaPromise } from '@prisma/client';
import { vincularMotaDto } from './dto/vincular-mota.dto';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ParcelasService } from 'src/parcelas/parcelas.service';
import { randomBytes } from 'crypto';
import { UpdateMotasBulkDto } from './dto/update-motas-bulk.dto';

@Injectable()
export class MotasService {

  private readonly logger = new Logger(MotasService.name);

  constructor(private prisma: PrismaService, private parcelasService: ParcelasService) {}


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

      } catch (error) {
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
          take: 24 // Últimas 24 mediciones (aprox 24h si es cada hora, o las últimas 24 muestras)
        }
      }
    });
  }

  async findOne(usuarioId: number, id: number): Promise<Mota | null> {
    return this.prisma.mota.findUnique({
      where: {id, usuarioId}
    });
  }

  async update(usuarioId: number, id: number, updateMotaDto: UpdateMotaDto): Promise<Mota> {
    
    //Tenemos que verificar si la parcela a la que se pretende vincular existe
    const parcelaId: number = updateMotaDto.parcelaId;

    if(parcelaId != null){
      if(await this.parcelasService.findOne(usuarioId,parcelaId) == null){
        throw new NotFoundException(`La parcela con ID ${parcelaId} no existe o no le pertenece al usuario propietario de la mota.`);
      }
    }
  
    //Tambien tenemos que verificar que el router exista, una mota puede estar conectada a un router que no 
    //sea propiedad del usuario

    const routerId: number = updateMotaDto.routerId;

    if(routerId != null){
      if(await this.prisma.router.findUnique({where: {id:routerId}}) == null){
        throw new NotFoundException(`El router con ID ${routerId} no existe.`);
      }
    }
    
    return this.prisma.mota.update({
      where: {id, usuarioId},
      data: updateMotaDto
    });
  }

  async remove(usuarioId: number, id: number): Promise<Mota> {
    return this.prisma.mota.delete({
      where: {id, usuarioId}
    });
  }

  async vincularMota(Userid: number ,vincularMotaDto: vincularMotaDto): Promise<Mota> {

    const {codigoVinculacion} = vincularMotaDto;

    //Buscar la mota
    const mota = await this.prisma.mota.findUnique({ where: {codigoVinculacion} });

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
          usuario : {
            connect: {id: Userid}
          },
          // Insertar la fecha y hora actuales
          claimedAt: new Date(),
        },
      });

      return motaActualizada;

    } catch (error) {
      // Si Prisma intenta conectar a un usuario que no existe, lanza el error 'P2025'
      if (error.code === 'P2025') {
        throw new NotFoundException(`El usuario no existe.`);
      }
      // Si es otro error de base de datos, lo dejamos pasar
      throw error; 
    }
  }

  async desvincularMota(usuarioId: number ,id: number): Promise<Mota> {

    //Buscar la mota
    const mota = await this.prisma.mota.findUnique({ where: {id, usuarioId} });

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

    } catch (error) {
      // Si Prisma intenta conectar a un usuario que no existe, lanza el error 'P2025'
      if (error.code === 'P2025') {
        throw new NotFoundException(`El usuario no existe.`);
      }
      // Si es otro error de base de datos, lo dejamos pasar
      throw error; 
    }
  }

  async actualizarMotas(usuarioId: number, updateMotasBulkDto: UpdateMotasBulkDto){
    
    const dataAActualizar: any = {};
    
    if (updateMotasBulkDto.frecuencia !== undefined) {
      dataAActualizar.frecuencia = updateMotasBulkDto.frecuencia;
    }
    
    if (updateMotasBulkDto.conexionPublica !== undefined) {
      dataAActualizar.conexionPublica = updateMotasBulkDto.conexionPublica;
    }

    if (Object.keys(dataAActualizar).length === 0) {
       return { ok: true, mensaje: "Ningún dato modificado" };
    }

    const operaciones: PrismaPromise<any>[] = [];

    let motasID: number[] = Array.from(new Set(updateMotasBulkDto.motaIds));


    for (const id of motasID) {
      operaciones.push(
        this.prisma.mota.update({
          where: { id, usuarioId }, 
          data: dataAActualizar, 
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
  
}
