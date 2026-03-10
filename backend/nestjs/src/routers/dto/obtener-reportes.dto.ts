import { IsNumber, IsNotEmpty, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ObtenerReportesDto {
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number) // Útil si viene de un query param
    routerId: number;

    @IsDateString()
    @IsNotEmpty()
    fechaBegin: string; // Se recibe como string ISO

    @IsDateString()
    @IsNotEmpty()
    fechaEnd: string;
}