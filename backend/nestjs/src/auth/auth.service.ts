import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService
  ) {}

  async login(data: LoginDto) {
    // 1. Buscamos al usuario por email
    const usuario = await this.usuariosService.findByEmail(data.email); 
    
    // 2. Comprobamos si existe y si la contraseña (hasheada) coincide
    if (!usuario || !(await bcrypt.compare(data.password, usuario.password))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 3. Creamos el Payload (lo que va dentro de la pulsera VIP)
    const payload = { email: usuario.email, sub: usuario.id };

    // 4. Firmamos y devolvemos el JWT
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}