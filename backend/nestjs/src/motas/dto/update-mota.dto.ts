import { PartialType } from '@nestjs/swagger';
import { CreateMotaDto } from './create-mota.dto';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMotaDto extends PartialType(CreateMotaDto) {

    @IsString()
    @IsOptional()
    nombre: string;

    @IsNumber()
    @IsOptional()
    parcelaId: number;

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

    @Type(() => Date)
    @IsOptional()
    fechaUltimaConexion: Date;
}
