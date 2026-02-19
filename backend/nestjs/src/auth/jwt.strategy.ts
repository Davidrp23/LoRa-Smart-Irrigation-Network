import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'GG#ukyBQu0jOM#25vu@Z1@r@StEFHnm^', // (solo pruebas) poner en el .env
    });
  }

  // Si el token es válido, NestJS ejecuta esto automáticamente
  async validate(payload: any) {
    // Esto es lo que acaba dentro de req.user
    return { id: payload.sub, email: payload.email }; 
  }
}