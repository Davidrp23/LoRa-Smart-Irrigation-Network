import { PartialType } from '@nestjs/swagger';
import { CreateMotaDto } from './create-mota.dto';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
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
    erroresRxMota: number;

    @Type(() => Date)
    @IsOptional()
    fechaUltimaConexion: Date;
}
