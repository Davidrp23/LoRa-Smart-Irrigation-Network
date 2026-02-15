import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; // IMPORTAR ESTO

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

  await app.listen(3000);
}
bootstrap();