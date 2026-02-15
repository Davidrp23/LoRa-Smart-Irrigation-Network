import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MotasModule } from './motas/motas.module';

@Module({
  imports: [MotasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
