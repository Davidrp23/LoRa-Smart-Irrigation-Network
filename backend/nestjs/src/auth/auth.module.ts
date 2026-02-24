import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosModule } from '../usuarios/usuarios.module'; // Necesitamos buscar usuarios
import { JwtStrategy } from './jwt.strategy';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import { HybridAuthGuard } from './guards/hybrid-auth.guard';

@Module({
  imports: [
    UsuariosModule,
    PassportModule,
    JwtModule.register({
      secret: 'GG#ukyBQu0jOM#25vu@Z1@r@StEFHnm^', // (solo pruebas) poner en el .env
      signOptions: { expiresIn: '1d' }, // Caduca en 1 día
    }),
  ],
  providers: [AuthService, JwtStrategy,DeviceAuthGuard,HybridAuthGuard],
  controllers: [AuthController],
  exports: [DeviceAuthGuard,HybridAuthGuard],
})
export class AuthModule {}