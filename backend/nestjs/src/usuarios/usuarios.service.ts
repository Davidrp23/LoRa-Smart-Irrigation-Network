import { Injectable } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from '@prisma/client'; // 2. Importa el Tipo de Prisma (El Entity real)
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {

  // 3. Inyecta Prisma en el constructor
  constructor(private prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    
    createUsuarioDto.password = await this.hashString(createUsuarioDto.password);
    
    return this.prisma.usuario.create({
      
      data: createUsuarioDto

    });
  }

  async findAll(): Promise<Usuario[]> {
    return this.prisma.usuario.findMany();
  }

  async findOne(id: number): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({
      where: { id }, // { id: id }
    });
  }

  async updateById(id: number, updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario> {
    // Si el DTO trae una password, hay que hashearla antes de guardar
    if (updateUsuarioDto.password) {
      updateUsuarioDto.password = await this.hashString(updateUsuarioDto.password);
    }

    return this.prisma.usuario.update({
      where: { id },
      data: updateUsuarioDto,
    });
  }

  async updateByEmail(email: string, updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario> {
    // Si el DTO trae una password, hay que hashearla antes de guardar
    if (updateUsuarioDto.password) {
      updateUsuarioDto.password = await this.hashString(updateUsuarioDto.password);
    }

    return this.prisma.usuario.update({
      where: { email },
      data: updateUsuarioDto,
    });
  }

  async removeByID(id: number): Promise<Usuario> {
    return this.prisma.usuario.delete({
      where: { id },
    });
  }

  async removeByEmail(email: string): Promise<Usuario> {
    return this.prisma.usuario.delete({
      where: { email },
    });
  }

  private async hashString(str: string): Promise<string> {
      const saltRounds = 10; // Define the cost factor for hashing
      return await bcrypt.hash(str, saltRounds);
  }
}
