import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaClientExceptionFilter } from 'nestjs-prisma';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- CONFIGURACIÓN SWAGGER (Añade esto) ---
  const config = new DocumentBuilder()
    .setTitle('FLoRa API')
    .setDescription('La API del TFG de Riego Inteligente')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  // ------------------------------------------

  // -----CONVERTIR ERRORES DE PRISMA A HTTP----
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));
  // ------------------------------------------

  // ----ACTIVA LA VALIDACION GLOBAL----
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,       // Borra datos que no estén en el DTO (seguridad)
    forbidNonWhitelisted: true, // Lanza error si envían datos extra
    transform: true,       // Convierte tipos automáticamente
  }));
  // ------------------------------------------

  await app.listen(3000);
}
bootstrap();