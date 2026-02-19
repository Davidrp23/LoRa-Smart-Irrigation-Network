import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateParcelaDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;  // Ej: "Sector Olivos A"

    @IsString()
    @IsNotEmpty()
    cultivo: string;
  
    // Centro aproximado de la parcela para el mapa
    @IsNumber()
    @IsNotEmpty()
    latitudCentro: number;

    @IsNumber()
    @IsNotEmpty()
    longitudCentro: number;
    
}
