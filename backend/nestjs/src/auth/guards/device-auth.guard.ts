// src/auth/guards/device-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Asegúrate de que esta ruta apunte a tu PrismaService

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Extraer las cabeceras. 
    // Express/Node.js siempre convierte las cabeceras a minúsculas por debajo.
    const rawDeviceId = request.headers['x-device-id'];
    const deviceToken = request.headers['x-device-token'];

    // Si falta alguna de las dos, fuera.
    if (!rawDeviceId || !deviceToken) {
      throw new UnauthorizedException('Faltan las credenciales del dispositivo (X-Device-Id o X-Device-Token)');
    }

    // Convertimos el ID a número (ya que por HTTP todo viaja como texto)
    const deviceId = parseInt(rawDeviceId, 10);

    if (isNaN(deviceId)) {
      throw new UnauthorizedException('El X-Device-Id debe ser un número válido');
    }

    // 2. Buscamos el router cruzando ambos datos para máxima seguridad
    const router = await this.prisma.router.findFirst({
      where: {
        id: deviceId,
        apiToken: deviceToken,
      },
    });

    // 3. Si no hay coincidencia, denegamos el acceso (sin dar pistas de qué falló)
    if (!router) {
      throw new UnauthorizedException('Credenciales de dispositivo inválidas');
    }

    // 4.
    // Inyectamos el router entero en la "request". 
    // Así el controlador ya no tiene que buscar en la BD a quién pertenecen los datos.
    request.device = router;

    return true; // ¡Adelante, puedes pasar!
  }
}