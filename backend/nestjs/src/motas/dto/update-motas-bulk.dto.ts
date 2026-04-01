// update-motas-bulk.dto.ts
import { IsArray, IsInt, Min, ArrayNotEmpty, IsOptional, isBoolean, IsBoolean } from 'class-validator';

export class UpdateMotasBulkDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'El array de motas no puede estar vacío' })
  @IsInt({ each: true, message: 'Cada ID de mota debe ser un número entero' })
  motaIds: number[];

  @IsInt()
  @Min(15, { message: 'La frecuencia mínima es de 15 minutos' })
  @IsOptional()
  frecuencia: number;

  @IsBoolean()
  @IsOptional()
  conexionPublica: boolean;

}