import { Injectable, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DeviceAuthGuard } from './device-auth.guard'; 

@Injectable()
export class HybridAuthGuard extends AuthGuard('jwt') { 
  
  constructor(@Inject(DeviceAuthGuard) private readonly deviceAuthGuard: DeviceAuthGuard) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Miramos si se encuentran los headers que enviaria un router
    const isDeviceRequest = request.headers['x-device-id'];

    if (isDeviceRequest) {
      // Se trata de un router
      return await this.deviceAuthGuard.canActivate(context);
    } else {
      // Se trata de un humano, usamos Passport (JWT). --> o de alguien que no incorpora ninguna medida de autenticacion, 
      //fallara de todos modos.
      try {
        const isHumanValid = await super.canActivate(context);
        return !!isHumanValid;
      } catch (error) {
        throw new UnauthorizedException('Acceso denegado.');
      }
    }
  }
}