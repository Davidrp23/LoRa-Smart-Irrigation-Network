import { PartialType } from '@nestjs/swagger';
import { CreateRouterDto } from './create-router.dto';
import { IsBoolean, IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRouterDto{
    @IsOptional()
    @IsString()
    nombre: string;

    @IsOptional()
    @IsString()
    ssid: string;  // Nombre de la red LoRa/WiFi

    @IsOptional()
    @IsNumber()
    canal: number;
    
    // --- ROAMING Y COMUNIDAD ---
    @IsOptional()
    @IsBoolean()
    esPublico: boolean; // TRUE = Vecinos pueden usarlo para enviar datos
    
    // --- UBICACIÓN ---
    @IsOptional()
    @IsNumber()
    latitud: number;

    @IsOptional()
    @IsNumber()
    longitud: number;  

    // --- ESTADO Y SALUD (Reportes periódicos) ---
    @IsOptional()
    @IsNumber()
    bateria: number;     // Si va con placa solar

    @IsOptional()
    @Type(() => Date)
    fechaUltimaConexion: Date;
    
    // --- CONTADORES DE TRÁFICO (Monitorización de Red) ---
    @IsOptional()
    @IsNumber()
    paquetesEnviados: number; 

    @IsOptional()
    @IsNumber()
    paquetesRecibidos: number; 

    @IsOptional()
    @IsNumber()
    erroresTx: number; // Fallo al enviar a la nube

    @IsOptional()
    @IsNumber()
    erroresRx: number; // Fallo al recibir de motas (CRC, ruido)

    @IsOptional()
    @IsNumber()
    erroresCrc: number; // Paquetes corruptos específicos

    @IsOptional()
    @IsNumber()
    cvgGPRS: number;

    @IsOptional()
    @IsNumber()
    erroresCriptograficos: number;

    @IsOptional()
    @IsNumber()
    erroresCanalOcupado: number;

    @IsOptional()
    @IsNumber()
    erroresColaLlena: number;

    @IsOptional()
    @IsNumber()
    versionAplicada: number;

    @IsNumber()
    @IsOptional()
    parcelaId: number;
}
