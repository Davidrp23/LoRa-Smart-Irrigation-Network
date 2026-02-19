import { PartialType } from '@nestjs/swagger';
import { CreateMotaDto } from './create-mota.dto';
import { IsDate, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateMotaDto extends PartialType(CreateMotaDto) {

    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsNumber()
    @IsNotEmpty()
    parcelaId: number;

    @IsNumber()
    @IsNotEmpty()
    latitud: number;

    @IsNumber()
    @IsNotEmpty()
    longitud: number;

    @IsNumber()
    @IsNotEmpty()
    routerId: number;

    @IsNumber()
    @IsNotEmpty()
    bateriaUltima: number;

    @IsDate()
    @IsNotEmpty()
    fechaUltimaConexion: Date;
}
