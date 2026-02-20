import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from '@prisma/client';

import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';


@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post() //Crea un usuario
  create(@Body() createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    return this.usuariosService.create(createUsuarioDto);
  }

  // @UseGuards(AuthGuard('jwt')) //No tiene sentido devolver todos los usuarios -> falla de seguridad
  // @Get()
  // findAll(): Promise<Usuario[]> {
  //   return this.usuariosService.findAll();
  // }

  @UseGuards(AuthGuard('jwt')) //Le devuelve la informacion de si mismo, de nadie mas
  @Get()
  async findOne(@Request() req): Promise<Usuario | null> {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.usuariosService.findOne(miPropioId);
  }

  @UseGuards(AuthGuard('jwt')) //Solo se puede actualizar a si mismo, a nadie mas
  @Patch()
  async updateById(@Request() req, @Body() updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario> {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.usuariosService.updateById(miPropioId, updateUsuarioDto);
  }

  // @UseGuards(AuthGuard('jwt'))
  // @Patch('email/:email')
  // async updateByEmail(@Param('email') email: string, @Body() updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario> {
  //   return this.usuariosService.updateByEmail(email, updateUsuarioDto);
  // }

  @UseGuards(AuthGuard('jwt'))  //Un usuario solo se puede eliminar a si mismo, a nadie mas
  @Delete()
  async removeById(@Request() req): Promise<Usuario> {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.usuariosService.removeByID(miPropioId);
  }

  // @UseGuards(AuthGuard('jwt'))
  // @Delete('email/:email')
  // async removeByEmail(@Param('email') email: string): Promise<Usuario> {
  //   return this.usuariosService.removeByEmail(email);
  // }
}
