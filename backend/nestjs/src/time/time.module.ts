// time/time.module.ts
// Módulo global para el servicio de tiempo con Luxon.
// Al ser Global, cualquier módulo que lo importe puede inyectar TimeService
// sin necesitar importar TimeModule directamente.

import { Global, Module } from '@nestjs/common';
import { TimeService } from './time.service';

@Global()
@Module({
  providers: [TimeService],
  exports:   [TimeService],
})
export class TimeModule {}
