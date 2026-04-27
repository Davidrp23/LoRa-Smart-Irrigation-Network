import { PartialType } from '@nestjs/swagger';
import { CreateMotaDto } from './create-mota.dto';
import { IsBoolean, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMotaDto{

    @IsString()
    @IsOptional()
    nombre: string;

    @IsNumber()
    @IsOptional()
    parcelaId: number;

    @IsNumber()
    @IsOptional()
    frecuencia: number; //Frecuencia con la que manda datos

    @IsNumber()
    @IsOptional()
    canal: number; //Canal LoRa en el que opera

    @IsNumber()
    @IsOptional()
    latitud: number;

    @IsNumber()
    @IsOptional()
    longitud: number;

    @IsNumber()
    @IsOptional()
    routerId: number;

    @IsNumber()
    @IsOptional()
    bateriaUltima: number;

    @IsNumber()
    @IsOptional()
    humedad: number;

    @IsNumber()
    @IsOptional()
    rssi: number;

    @IsNumber()
    @IsOptional()
    snr: number;

    @IsNumber()
    @IsOptional()
    paquetesEnviados: number;

    @IsNumber()
    @IsOptional()
    paquetesRecibidos: number;

    @IsNumber()
    @IsOptional()
    erroresRx: number;

    @IsNumber()
    @IsOptional()
    erroresTx: number;

    @IsNumber()
    @IsOptional()
    erroresCanalOcupado: number;

    @IsNumber()
    @IsOptional()
    erroresCriptograficos: number;

    @IsNumber()
    @IsOptional()
    erroresCrc: number;

    @IsNumber()
    @IsOptional()
    erroresACKfaltante: number;

    @IsNumber()
    @IsOptional()
    versionAplicada: number;

    @Type(() => Date)
    @IsOptional()
    fechaUltimaConexion: Date;

    @IsBoolean()
    @IsOptional()
    conexionPublica: boolean;
}
