import { IsNumber, IsNotEmpty, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ObtenerHistoricoDto {
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number) // Útil si viene de un query param
    parcelaId: number;

    @IsDateString()
    @IsNotEmpty()
    fechaBegin: string; // Se recibe como string ISO

    @IsDateString()
    @IsNotEmpty()
    fechaEnd: string;
}